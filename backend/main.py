from fastapi import FastAPI, Request, Depends, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
import os

from dotenv import load_dotenv
from pathlib import Path as _Path

# Load repo-root .env FIRST — database.py reads DATABASE_URL at import time.
load_dotenv(dotenv_path=_Path(__file__).resolve().parent.parent / ".env")

from backend.database import engine, Base, get_db
from backend import models

# Create database tables (best-effort: a DB blip must never kill boot)
try:
    Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"[BOOT] create_all deferred (DB unreachable?): {e}")

from backend.scheduler import start_scheduler, run_autonomous_discovery
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting Background Scheduler...")
    start_scheduler()
    yield
    print("Shutting down Scheduler...")

app = FastAPI(title="GrowthPilot API", lifespan=lifespan)

from pydantic import BaseModel

class DiscoveryRequest(BaseModel):
    query: str = "companies looking for b2b saas solutions"
    user_id: str

class AutoDiscoveryRequest(BaseModel):
    category: str = "dentists"
    city: str = "Riyadh, Saudi Arabia"
    user_id: str = "default_user"
    max_results: int = 25

@app.post("/api/discover")
def auto_discover(request: AutoDiscoveryRequest, background_tasks: BackgroundTasks):
    """Autonomous lead find: OSM + Places API + website crawl -> verify -> draft. No CSV."""
    from backend.scheduler import run_lead_pipeline
    from backend.database import SessionLocal
    db = SessionLocal()
    try:
        job = models.JobRun(user_id=request.user_id, kind="discover",
                            status="queued", stage="queued")
        db.add(job)
        db.commit()
        db.refresh(job)
        jid = job.id
    except Exception:
        db.rollback()
        jid = None
    finally:
        db.close()
    background_tasks.add_task(run_lead_pipeline, request.category, request.city, request.user_id, request.max_results, jid)
    out = {"status": f"Auto-discovery queued: {request.category} in {request.city}"}
    if jid:
        out["job_id"] = jid
    return out

def need_seat(db: Session, user_id: str):
    """Closed-beta gate for expensive actions. No seat = 403."""
    from backend import plans as _plans
    if not _plans.has_seat(db, user_id):
        raise HTTPException(status_code=403, detail="Early access required — sign in with an invited Google account.")


@app.post("/api/trigger-discovery")
def trigger_discovery(request: DiscoveryRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Allows the Next.js Dashboard to instantly force a Discovery Run with a custom query"""
    need_seat(db, request.user_id)
    # Pass the query and user_id to the background job
    background_tasks.add_task(run_autonomous_discovery, request.query, request.user_id)
    return {"status": f"Discovery Queued for: {request.query}"}

from backend.scheduler import run_autonomous_followups
from backend.whatsapp_provider import send_whatsapp_message

@app.post("/api/trigger-followups")
def trigger_followups(background_tasks: BackgroundTasks):
    """Instantly forces the Follow-up Engine to scan and text non-repliers"""
    background_tasks.add_task(run_autonomous_followups)
    return {"status": "Follow-up Engine Queued!"}

@app.post("/api/approve/{prospect_id}")
def approve_outreach(prospect_id: int, user_id: str, db: Session = Depends(get_db)):
    """Approves a drafted message and sends it via WhatsApp (guarded, capped, logged)"""
    need_seat(db, user_id)
    from backend.outreach_queue import can_send, log_message
    prospect = db.query(models.Prospect).filter(models.Prospect.id == prospect_id, models.Prospect.user_id == user_id).first()
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")
    ok, reason = can_send(db, prospect, user_id)
    if not ok:
        # 429 only for real rate-limit; everything else 403 with plain reason
        if reason.startswith("daily-cap"):
            raise HTTPException(status_code=429, detail=f"Daily cap reached ({reason}). Try tomorrow.")
        if reason == "outside-work-hours-recipient":
            raise HTTPException(status_code=403, detail="Outside recipient work hours (8am-8pm). Try again 8am-8pm IST.")
        raise HTTPException(status_code=403, detail=f"Blocked: {reason}")
    from backend import plans as _plans
    ok, reason = _plans.check_limit(db, user_id, "messages")
    if not ok:
        raise HTTPException(status_code=429, detail=f"Plan limit reached ({reason}). Upgrade to send more.")
    draft = (prospect.business_signals or {}).get("draft_message", "Hello!")

    # Self-DM guard: never send to the owner's own number (dashboard setting).
    import os as _os
    from backend.outreach_queue import same_number, get_admin_phone
    try:
        admin_digits = get_admin_phone(db, user_id)
    except Exception:
        admin_digits = _os.getenv("ADMIN_PHONE_NUMBER", "") or ""
    target_digits = "".join(filter(str.isdigit, prospect.public_phone or ""))
    if not target_digits:
        raise HTTPException(status_code=400, detail="Prospect has no phone number")
    if admin_digits and same_number(target_digits, admin_digits):
        raise HTTPException(status_code=400, detail="Blocked: lead phone is your own number — run /api/discover for real leads")

    # Send directly to the stranger's scraped public phone number using this user's WA Engine
    result = send_whatsapp_message(prospect.public_phone, draft, user_id)
    if not result or result.get("status") != "sent":
        err = (result or {}).get("error", "WhatsApp service unreachable/not connected") if isinstance(result, dict) else "WhatsApp service unreachable/not connected"
        raise HTTPException(status_code=502, detail=f"Not sent: {err}")
    # Remember the real JID (often a LID) so replies map back to this prospect
    try:
        sig = dict(prospect.business_signals or {})
        if result.get("jid"):
            sig["jid"] = result["jid"]
            prospect.business_signals = sig
    except Exception:
        pass
    log_message(db, prospect.id, "OUTBOUND", draft, "SENT")
    
    prospect.pipeline_state = models.PipelineState.CONTACTED
    db.commit()
    from backend import plans as _plans2
    _plans2.bump(db, user_id, "messages")
    return {"status": "Sent!"}

from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

import requests as _rq
_WA_LOCAL = "http://127.0.0.1:3001"

@app.get("/api/whatsapp/status")
def wa_status_proxy(userId: str = "default_user"):
    """Public QR/status for dashboards that can't reach the WA port directly
    (e.g. Vercel frontend -> Koyeb backend). Proxies the local WA engine."""
    try:
        r = _rq.get(f"{_WA_LOCAL}/api/whatsapp/status", params={"userId": userId}, timeout=20)
        return r.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"WA engine unreachable: {str(e)[:150]}")


class PairRequest(BaseModel):
    userId: str = "default_user"
    phone: str = ""
    fresh: bool = False


class RestoreRequest(BaseModel):
    userId: str = ""
    files: dict = {}


class VaultBackup(BaseModel):
    userId: str = ""
    files: dict = {}


@app.post("/api/whatsapp/vault-backup")
def wa_vault_backup(request: VaultBackup, db: Session = Depends(get_db)):
    """Engine auto-saves linked sessions here (survives redeploys)."""
    if not request.userId or "creds.json" not in (request.files or {}):
        raise HTTPException(status_code=422, detail="userId + files incl. creds.json required")
    names = [n for n in request.files if isinstance(n, str) and len(n) < 64 and not n.startswith(".")]
    if len(names) > 30:
        raise HTTPException(status_code=422, detail="too many files")
    row = db.query(models.WaSession).filter(models.WaSession.user_id == request.userId).first()
    payload = {n: request.files[n] for n in names}
    if row:
        row.files = payload
    else:
        db.add(models.WaSession(user_id=request.userId, files=payload))
    db.commit()
    return {"ok": True, "files": len(payload)}


@app.get("/api/whatsapp/vault/{user_id}")
def wa_vault_fetch(user_id: str, db: Session = Depends(get_db)):
    """Fetch one backed-up session (engine boot resurrection)."""
    row = db.query(models.WaSession).filter(models.WaSession.user_id == user_id).first()
    if not row or not (row.files or {}).get("creds.json"):
        raise HTTPException(status_code=404, detail="no backup")
    return {"userId": user_id, "files": row.files}


@app.get("/api/health")
def health():
    """Liveness with zero dependencies (no DB, no engine) — uptime monitors hit this."""
    import time
    return {"ok": True, "time": int(time.time())}


@app.get("/api/whatsapp/vault")
def wa_vault_list(db: Session = Depends(get_db)):
    """All userIds with session backups (engine boot resurrection)."""
    rows = db.query(models.WaSession.user_id).all()
    return {"userIds": [r[0] for r in rows]}


@app.get("/api/whatsapp/linklog")
def wa_linklog_proxy(userId: str = "default_user"):
    """Pairing handshake proof: what WHATSAPP answered (not just our app)."""
    try:
        r = _rq.get(f"{_WA_LOCAL}/api/whatsapp/linklog", params={"userId": userId}, timeout=20)
        return r.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"WA engine unreachable: {str(e)[:150]}")


@app.post("/api/whatsapp/restore")
def wa_restore_proxy(request: RestoreRequest):
    """Upload a home-linked WhatsApp session to the cloud engine (see wa-service)."""
    if not request.userId or "creds.json" not in (request.files or {}):
        raise HTTPException(status_code=422, detail="userId + files incl. creds.json required")
    try:
        r = _rq.post(f"{_WA_LOCAL}/api/whatsapp/restore",
                     json={"userId": request.userId, "files": request.files}, timeout=120)
        try:
            return r.json()
        except Exception:
            raise HTTPException(status_code=r.status_code, detail=f"WA engine said {r.status_code}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"WA engine unreachable: {str(e)[:150]}")


@app.post("/api/whatsapp/pair")
def wa_pair_proxy(request: PairRequest, db: Session = Depends(get_db)):
    """Pairing-code login for phones that can't scan QR (mobile browsers).
    Phone must be full international digits WITH country code, e.g.
    919876543210 (IN), 971501234567 (AE), 966551234567 (SA)."""
    need_seat(db, request.userId)
    import re
    digits = re.sub(r"\D", "", request.phone or "")
    """Pairing-code login for phones that can't scan QR (mobile browsers).
    Phone must be full international digits WITH country code, e.g.
    919876543210 (IN), 971501234567 (AE), 966551234567 (SA)."""
    import re
    digits = re.sub(r"\D", "", request.phone or "")
    if len(digits) < 10 or len(digits) > 15:
        raise HTTPException(status_code=422, detail="phone must be 10-15 digits WITH country code, e.g. 919876543210")
    try:
        r = _rq.post(f"{_WA_LOCAL}/api/whatsapp/pair",
                     json={"userId": request.userId, "phone": digits, "fresh": request.fresh}, timeout=120)
        try:
            return JSONResponse(status_code=r.status_code, content=r.json())
        except Exception:
            raise HTTPException(status_code=r.status_code, detail=f"WA engine said {r.status_code}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"WA engine unreachable: {str(e)[:150]}")

class ClientLogRequest(BaseModel):
    where: str = ""
    message: str = ""
    stack: str = ""
    url: str = ""


@app.post("/api/client-log")
def client_log(request: ClientLogRequest):
    """Receives browser crash reports from the dashboard global-error trap."""
    print(f"[CLIENT-LOG] {request.where} @ {request.url}: {request.message[:300]}")
    if request.stack:
        print(f"[CLIENT-LOG] stack: {request.stack[:500]}")
    return {"status": "logged"}


@app.get("/api/settings")
def get_settings(user_id: str, db: Session = Depends(get_db)):
    """Owner settings (boss alert number, ...)."""
    s = db.query(models.UserSettings).filter(models.UserSettings.user_id == user_id).first()
    return {"admin_phone": (s.admin_phone if s and s.admin_phone else "")}


class SettingsRequest(BaseModel):
    user_id: str = "default_user"
    admin_phone: str | None = None  # None = leave untouched
    plan: str | None = None  # None = leave untouched
    email: str | None = None  # first touch claims an early-access seat


@app.post("/api/settings")
def save_settings(request: SettingsRequest, db: Session = Depends(get_db)):
    """Save owner settings from dashboard (boss WhatsApp number, plan)."""
    from backend import plans as _plans
    # Closed beta: claiming a seat happens on first touch.
    ok, msg = _plans.claim_seat(db, request.user_id, request.email or "")
    if not ok:
        raise HTTPException(status_code=403, detail=msg)
    s = db.query(models.UserSettings).filter(models.UserSettings.user_id == request.user_id).first()
    if not s:
        s = models.UserSettings(user_id=request.user_id, admin_phone="", plan="free")
        db.add(s)
    if request.admin_phone is not None:
        _digits = "".join(filter(str.isdigit, request.admin_phone or ""))
        if _digits and (len(_digits) < 11 or len(_digits) > 15):
            raise HTTPException(status_code=422, detail="Boss number must include country code (11-15 digits), e.g. 919042500863 — bare 10-digit numbers can't receive alerts.")
        s.admin_phone = _digits
    if (request.plan or "") in _plans.TIERS:
        s.plan = request.plan
    db.commit()
    db.refresh(s)
    return {"status": "saved", "admin_phone": s.admin_phone, "plan": s.plan,
            "usage": _plans.usage_summary(db, request.user_id)}


@app.get("/api/usage")
def get_usage(user_id: str, db: Session = Depends(get_db)):
    """Plan + meter readings for the dashboard."""
    from backend import plans as _plans
    return _plans.usage_summary(db, user_id)


class ProfileRequest(BaseModel):
    user_id: str = "default_user"
    business_name: str = ""
    industry: str = ""
    services: str = ""
    pricing: str = ""
    hours: str = ""
    location: str = ""
    faq: list = []
    tone: str = ""
    avg_deal_inr: int | None = None


@app.get("/api/profile")
def get_profile(user_id: str, db: Session = Depends(get_db)):
    """Business profile the AI receptionist answers from."""
    p = db.query(models.BusinessProfile).filter(
        models.BusinessProfile.user_id == user_id).first()
    if not p:
        return {"business_name": "", "industry": "", "services": "", "pricing": "",
                "hours": "", "location": "", "faq": [], "tone": "", "avg_deal_inr": 5000}
    return {"business_name": p.business_name or "", "industry": p.industry or "",
            "services": p.services or "", "pricing": p.pricing or "",
            "hours": p.hours or "", "location": p.location or "",
            "faq": p.faq or [], "tone": p.tone or "",
            "avg_deal_inr": p.avg_deal_inr or 5000}


@app.post("/api/profile")
def save_profile(request: ProfileRequest, db: Session = Depends(get_db)):
    """Save the business profile. Empty pricing = AI must never quote prices."""
    p = db.query(models.BusinessProfile).filter(
        models.BusinessProfile.user_id == request.user_id).first()
    if not p:
        p = models.BusinessProfile(user_id=request.user_id)
        db.add(p)
    p.business_name = (request.business_name or "")[:200]
    p.industry = (request.industry or "")[:50]
    p.services = (request.services or "")[:2000]
    p.pricing = (request.pricing or "")[:2000]
    p.hours = (request.hours or "")[:500]
    p.location = (request.location or "")[:300]
    p.faq = request.faq or []
    p.tone = (request.tone or "")[:200]
    try:
        if request.avg_deal_inr is not None and int(request.avg_deal_inr) > 0:
            p.avg_deal_inr = int(request.avg_deal_inr)
    except Exception:
        pass
    db.commit()
    return {"status": "saved"}


class ResumeRequest(BaseModel):
    user_id: str = "default_user"
    sender_phone: str = ""


@app.post("/api/resume")
def resume_ai(request: ResumeRequest, db: Session = Depends(get_db)):
    """Resume AI for a muted conversation (owner took over, now hands back)."""
    n = 0
    m = db.query(models.TakeoverMute).filter(
        models.TakeoverMute.user_id == request.user_id,
        models.TakeoverMute.sender_phone == request.sender_phone).first()
    if m and m.muted:
        m.muted = False
        n += 1
    p = db.query(models.Prospect).filter(
        models.Prospect.user_id == request.user_id,
        models.Prospect.public_phone == request.sender_phone).first()
    if p and p.ai_muted:
        p.ai_muted = False
        n += 1
    db.commit()
    return {"status": "resumed" if n else "nothing-muted"}


class RecoveryEditRequest(BaseModel):
    user_id: str = "default_user"
    draft: str = ""


@app.get("/api/recovery")
def list_recovery(user_id: str, db: Session = Depends(get_db)):
    """Pending recovery opportunities: temp, reason, editable draft."""
    rows = db.query(models.RecoveryDraft).filter(
        models.RecoveryDraft.user_id == user_id,
        models.RecoveryDraft.status == "pending").order_by(
        models.RecoveryDraft.score.desc()).all()
    out = []
    for r in rows:
        p = db.query(models.Prospect).filter(models.Prospect.id == r.prospect_id).first()
        out.append({"id": r.id, "company": p.company_name if p else "?",
                    "phone": p.public_phone if p else "",
                    "temp": r.temp, "score": r.score, "reason": r.reason,
                    "next_action": r.next_action, "draft": r.draft,
                    "created_at": str(r.created_at)})
    return {"recovery": out}


@app.patch("/api/recovery/{draft_id}")
def edit_recovery(draft_id: int, request: RecoveryEditRequest,
                  db: Session = Depends(get_db)):
    """Owner edits the recovery message before sending."""
    r = db.query(models.RecoveryDraft).filter(
        models.RecoveryDraft.id == draft_id,
        models.RecoveryDraft.user_id == request.user_id,
        models.RecoveryDraft.status == "pending").first()
    if not r:
        raise HTTPException(status_code=404, detail="Pending draft not found")
    r.draft = (request.draft or "")[:2000]
    db.commit()
    return {"status": "saved", "id": r.id}


@app.post("/api/recovery/{draft_id}/approve")
def approve_recovery(draft_id: int, user_id: str, db: Session = Depends(get_db)):
    """Owner-approved recovery send. Same guards as cold outreach + plan meter."""
    from backend.outreach_queue import can_send, log_message, same_number, get_admin_phone
    from backend import plans as _plans
    r = db.query(models.RecoveryDraft).filter(
        models.RecoveryDraft.id == draft_id,
        models.RecoveryDraft.user_id == user_id,
        models.RecoveryDraft.status == "pending").first()
    if not r:
        raise HTTPException(status_code=404, detail="Pending draft not found")
    prospect = db.query(models.Prospect).filter(
        models.Prospect.id == r.prospect_id,
        models.Prospect.user_id == user_id).first()
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")
    ok, reason = can_send(db, prospect, user_id)
    if not ok:
        if reason.startswith("daily-cap"):
            raise HTTPException(status_code=429, detail=f"Daily cap reached ({reason}). Try tomorrow.")
        raise HTTPException(status_code=403, detail=f"Blocked: {reason}")
    ok, reason = _plans.check_limit(db, user_id, "messages")
    if not ok:
        raise HTTPException(status_code=429, detail=f"Plan limit reached ({reason}). Upgrade to send more.")
    try:
        admin_phone = get_admin_phone(db, user_id)
    except Exception:
        admin_phone = ""
    target = "".join(filter(str.isdigit, prospect.public_phone or ""))
    if not target:
        raise HTTPException(status_code=400, detail="Prospect has no phone number")
    if admin_phone and same_number(target, admin_phone):
        raise HTTPException(status_code=400, detail="Blocked: lead phone is your own number")
    result = send_whatsapp_message(prospect.public_phone, r.draft, user_id)
    if not result or result.get("status") != "sent":
        err = (result or {}).get("error", "WhatsApp service unreachable/not connected") \
            if isinstance(result, dict) else "WhatsApp service unreachable/not connected"
        raise HTTPException(status_code=502, detail=f"Not sent: {err}")
    try:
        sig = dict(prospect.business_signals or {})
        if result.get("jid"):
            sig["jid"] = result["jid"]
            prospect.business_signals = sig
    except Exception:
        pass
    log_message(db, prospect.id, "OUTBOUND", r.draft, "SENT")
    _plans.bump(db, user_id, "messages")
    r.status = "sent"
    if prospect.pipeline_state != models.PipelineState.DO_NOT_CONTACT:
        prospect.pipeline_state = models.PipelineState.CONTACTED
    db.commit()
    return {"status": "Sent!"}


@app.post("/api/trigger-recovery")
def trigger_recovery(user_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Queue a recovery scan (detect + score + draft). Results land as pending."""
    need_seat(db, user_id)
    from backend.scheduler import run_recovery_scan
    background_tasks.add_task(run_recovery_scan, user_id)
    return {"status": f"Recovery scan queued for {user_id}"}


@app.post("/api/recovery/{draft_id}/skip")
def skip_recovery(draft_id: int, user_id: str, db: Session = Depends(get_db)):
    """Archive a recovery draft without sending."""
    r = db.query(models.RecoveryDraft).filter(
        models.RecoveryDraft.id == draft_id,
        models.RecoveryDraft.user_id == user_id,
        models.RecoveryDraft.status == "pending").first()
    if not r:
        raise HTTPException(status_code=404, detail="Pending draft not found")
    r.status = "skipped"
    db.commit()
    return {"status": "skipped"}


@app.get("/api/money")
def money_overview(user_id: str, db: Session = Depends(get_db)):
    """Outcome dashboard: unanswered, hot, due, meetings, recovered, pipeline ₹.
    Formula is transparent: expected = score% x avg_deal per open lead."""
    open_states = [models.PipelineState.NEW, models.PipelineState.RESEARCHING,
                   models.PipelineState.QUALIFIED, models.PipelineState.OUTREACH_READY,
                   models.PipelineState.CONTACTED, models.PipelineState.WAITING,
                   models.PipelineState.REPLIED, models.PipelineState.INTERESTED,
                   models.PipelineState.PROPOSAL]
    prospects = db.query(models.Prospect).filter(
        models.Prospect.user_id == user_id).all()
    prof = db.query(models.BusinessProfile).filter(
        models.BusinessProfile.user_id == user_id).first()
    # Honest pipeline: no invented deal size. Until the owner sets their avg
    # deal in Business, we show NO rupee estimate — only real counts.
    avg_set = bool(prof and (prof.avg_deal_inr or 0) > 0 and (
        (prof.business_name or "").strip() or (prof.services or "").strip()))
    avg = (prof.avg_deal_inr if prof and prof.avg_deal_inr else 5000) or 5000
    mem_by_pid = {}
    try:
        for m in db.query(models.LeadMemory).filter(
                models.LeadMemory.user_id == user_id).all():
            mem_by_pid[m.prospect_id] = m
    except Exception:
        pass
    state_score = {"NEW": 10, "RESEARCHING": 15, "QUALIFIED": 40, "OUTREACH_READY": 20,
                   "CONTACTED": 30, "WAITING": 35, "REPLIED": 50, "INTERESTED": 90,
                   "PROPOSAL": 95}
    pipeline = 0
    hot = 0
    for p in prospects:
        st = p.pipeline_state.value if hasattr(p.pipeline_state, "value") else str(p.pipeline_state)
        if st in ("WON", "LOST", "DO_NOT_CONTACT"):
            continue
        mem = mem_by_pid.get(p.id)
        score = mem.lead_score if mem and mem.lead_score else state_score.get(st, 10)
        if avg_set:
            pipeline += int(score / 100 * avg)
        if (mem and mem.temp == "HOT") or st == "INTERESTED":
            hot += 1
    try:
        pending_rec = db.query(models.RecoveryDraft).filter(
            models.RecoveryDraft.user_id == user_id,
            models.RecoveryDraft.status == "pending").count()
        sent_rec = db.query(models.RecoveryDraft).filter(
            models.RecoveryDraft.user_id == user_id,
            models.RecoveryDraft.status == "sent").count()
        meetings = db.query(models.Meeting).filter(
            models.Meeting.user_id == user_id,
            models.Meeting.status == "BOOKED").count()
        done_rows = db.query(models.Meeting).filter(
            models.Meeting.user_id == user_id,
            models.Meeting.status == "DONE").all()
    except Exception:
        pending_rec, sent_rec, meetings = 0, 0, 0
        done_rows = []
    contacted = sum(1 for p in prospects if str(getattr(p.pipeline_state, "value", p.pipeline_state)) == "CONTACTED")
    try:
        ai_msgs = db.query(models.Message).filter(
            models.Message.channel == "WHATSAPP",
            models.Message.direction == "OUTBOUND").count()
    except Exception:
        ai_msgs = 0
    recovered_revenue = sum((m.amount_inr or 0) for m in done_rows)
    return {
        "estimated_pipeline_inr": pipeline if avg_set else None,
        "avg_deal_inr": avg,
        "avg_deal_set": avg_set,
        "hot_leads": hot,
        "followups_due": contacted + pending_rec,
        "meetings_booked": meetings,
        "recovered": sent_rec + meetings + len(done_rows),
        "recovered_revenue_inr": recovered_revenue,
        "unanswered": contacted,
        "hours_saved": round(ai_msgs * 2 / 60, 1),
        "formula": "expected per lead = score% x YOUR avg deal (set in Business); recovered ₹ = your marked wins only",
    }


@app.get("/api/jobs")
def list_jobs(user_id: str, db: Session = Depends(get_db)):
    """Latest job runs so the dashboard shows progress, not silence."""
    try:
        rows = db.query(models.JobRun).filter(
            models.JobRun.user_id == user_id).order_by(
            models.JobRun.id.desc()).limit(5).all()
        return {"jobs": [{"id": r.id, "kind": r.kind, "status": r.status,
                           "stage": r.stage or "", "total": r.total or 0,
                           "done": r.done_count or 0, "result": r.result or "",
                           "updated_at": str(r.updated_at)} for r in rows]}
    except Exception:
        return {"jobs": []}


@app.get("/api/templates")
def list_templates():
    """Industry packs for the picker."""
    from backend import templates as _t
    return {"templates": _t.list_packs()}


class TemplateApplyRequest(BaseModel):
    user_id: str = "default_user"
    industry: str = ""


@app.post("/api/templates/apply")
def apply_template(request: TemplateApplyRequest, db: Session = Depends(get_db)):
    """Fill empty profile fields from an industry pack. Never overwrites."""
    from backend import templates as _t
    return _t.apply_pack(db, request.user_id, request.industry)


@app.get("/api/muted")
def list_muted(user_id: str, db: Session = Depends(get_db)):
    """Chats where AI is paused (owner took over). Resume from here."""
    out = []
    try:
        for m in db.query(models.TakeoverMute).filter(
                models.TakeoverMute.user_id == user_id,
                models.TakeoverMute.muted == True).order_by(  # noqa: E712
                models.TakeoverMute.id.desc()).all():  # noqa: E712
            p = db.query(models.Prospect).filter(
                models.Prospect.user_id == user_id,
                models.Prospect.public_phone == m.sender_phone).first()
            out.append({"sender_phone": m.sender_phone,
                        "company": p.company_name if p else f"Chat {m.sender_phone[-6:]}",
                        "since": str(m.updated_at)})
    except Exception as e:
        print(f"[MUTED] list fail: {e}")
    return {"muted": out}


@app.get("/api/meetings")
def get_meetings(user_id: str, db: Session = Depends(get_db)):
    """Boss view: every booked meeting with company, agreed time, interest + join link."""
    rows = db.query(models.Meeting).filter(models.Meeting.user_id == user_id).order_by(models.Meeting.id.desc()).all()
    out = []
    for m in rows:
        p = db.query(models.Prospect).filter(models.Prospect.id == m.prospect_id).first()
        out.append({"id": m.id, "company": p.company_name if p else "?",
                    "phone": p.public_phone if p else "",
                    "time": m.meeting_time, "link": m.meet_link,
                    "provider": m.provider, "interest": m.interest,
                    "status": m.status, "created_at": str(m.created_at)})
    return {"meetings": out}


class WonRequest(BaseModel):
    user_id: str = "default_user"
    amount_inr: int = 0


@app.post("/api/meetings/{meeting_id}/won")
def mark_meeting_won(meeting_id: int, request: WonRequest, db: Session = Depends(get_db)):
    """Owner marks a booked call as won with the real collected amount.
    This is the ONLY source of recovered revenue — everything else is estimate."""
    m = db.query(models.Meeting).filter(
        models.Meeting.id == meeting_id,
        models.Meeting.user_id == request.user_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found")
    m.status = "DONE"
    try:
        m.amount_inr = max(0, int(request.amount_inr or 0))
    except Exception:
        m.amount_inr = 0
    p = db.query(models.Prospect).filter(models.Prospect.id == m.prospect_id).first()
    if p:
        p.pipeline_state = models.PipelineState.WON
    db.commit()
    return {"status": "won", "amount_inr": m.amount_inr}

@app.get("/api/dashboard")
def get_dashboard_data(user_id: str, db: Session = Depends(get_db)):
    prospects = db.query(models.Prospect).filter(models.Prospect.user_id == user_id).all()
    metrics = {
        "total_leads": len(prospects),
        "new": sum(1 for p in prospects if p.pipeline_state == models.PipelineState.NEW),
        "researching": sum(1 for p in prospects if p.pipeline_state == models.PipelineState.RESEARCHING),
        "outreach_ready": sum(1 for p in prospects if p.pipeline_state == models.PipelineState.OUTREACH_READY),
        "replied": sum(1 for p in prospects if p.pipeline_state == models.PipelineState.REPLIED)
    }
    return {"metrics": metrics, "pipeline": prospects}

# --- WHATSAPP CLOUD API SETUP ---
WHATSAPP_VERIFY_TOKEN = os.getenv("WHATSAPP_VERIFY_TOKEN", "demo_verify_token")
WHATSAPP_API_TOKEN = os.getenv("WHATSAPP_API_TOKEN", "")

@app.get("/")
def read_root():
    # "Live" = serving traffic. Engine tells you which WhatsApp path is active:
    # real Meta Cloud API token, or our Baileys engine (default).
    _tok = (os.getenv("WHATSAPP_API_TOKEN", "") or "").strip()
    engine = "CloudAPI" if _tok and _tok != "your_meta_access_token" else "Baileys"
    return {"status": "GrowthPilot Backend Alive", "mode": f"Live-{engine}"}

# --- WHATSAPP WEBHOOK (VERIFICATION) ---
@app.get("/webhook/whatsapp")
def verify_whatsapp(request: Request):
    """
    Required by Meta to verify the Webhook URL for the WhatsApp Cloud API.
    """
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")

    if mode == "subscribe" and token == WHATSAPP_VERIFY_TOKEN:
        return int(challenge)
    raise HTTPException(status_code=403, detail="Invalid verification token")

# --- WHATSAPP WEBHOOK (RECEIVE MESSAGES VIA META) ---
@app.post("/webhook/whatsapp")
async def receive_whatsapp(request: Request, db: Session = Depends(get_db)):
    """Receives real-time inbound messages from prospects via Meta API."""
    data = await request.json()
    try:
        entry = data.get('entry', [])[0]
        changes = entry.get('changes', [])[0]
        value = changes.get('value', {})
        if 'messages' in value:
            msg = value['messages'][0]
            sender_phone = msg['from']
            if msg.get('type') == 'text':
                text = msg['text']['body']
                print(f"NEW INBOUND MESSAGE from {sender_phone}: {text}")
                from backend.agent import process_message
                ai_reply = process_message(text, sender_phone, db)
                from backend.whatsapp_provider import send_whatsapp_message
                send_whatsapp_message(sender_phone, ai_reply)
    except Exception as e:
        print(f"Webhook processing error: {e}")
    return {"status": "received"}

# --- WHATSAPP WEBHOOK (RECEIVE MESSAGES VIA BAILEYS) ---
@app.post("/webhook/baileys")
async def receive_baileys(request: Request, db: Session = Depends(get_db)):
    """Receives inbound messages from our local Baileys Node server"""
    data = await request.json()
    print("RAW WEBHOOK DATA:", data)
    try:
        user_id = data.get("user_id", "default_user")
        msg = data.get("message", {})
        key = msg.get("key", {})
        remote_jid = key.get("remoteJid", "")
        from_me = key.get("fromMe", False)
        
        # Extract phone regardless of colon or @ domain.
        # NOTE: modern WhatsApp uses LIDs (long numbers) as JIDs; the contact's
        # real phone may differ. Match prospects by phone OR by stored JID.
        # senderPn (forwarded by wa-service) unmasks LIDs to real phones.
        sender_phone_with_device = remote_jid.split("@")[0]
        sender_phone = sender_phone_with_device.split(":")[0]
        _pn = "".join(filter(str.isdigit, (key.get("senderPn", "") or "").split("@")[0]))
        if _pn and len(_pn) >= 10:
            print(f"[LID-UNMASK] {sender_phone} -> +{_pn}")
            sender_phone = _pn

        def _find_prospect(db, sender_phone, remote_jid, user_id):
            p = db.query(models.Prospect).filter(
                models.Prospect.public_phone == sender_phone,
                models.Prospect.user_id == user_id).first()
            if p:
                return p
            # LID fallback: compare against JIDs learned on previous sends
            jid_digits = "".join(filter(str.isdigit, remote_jid.split("@")[0]))
            cands = db.query(models.Prospect).filter(
                models.Prospect.user_id == user_id,
                models.Prospect.pipeline_state.in_([
                    models.PipelineState.CONTACTED, models.PipelineState.WAITING,
                    models.PipelineState.REPLIED, models.PipelineState.INTERESTED,
                ])).all()
            for c in cands:
                sig = c.business_signals or {}
                for k in ("jid", "last_jid"):
                    if sig.get(k) and "".join(filter(str.isdigit, str(sig[k]).split("@")[0])) == jid_digits:
                        return c
            return None

        prospect = _find_prospect(db, sender_phone, remote_jid, user_id)

        from datetime import datetime, timedelta, timezone
        def _mute_active(db, user_id, sender_phone):
            m = db.query(models.TakeoverMute).filter(
                models.TakeoverMute.user_id == user_id,
                models.TakeoverMute.sender_phone == sender_phone,
                models.TakeoverMute.muted == True).first()  # noqa: E712
            if not m:
                return False
            ts = m.updated_at
            if ts is None:
                return True
            if ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            # Mute expires after 24h of owner silence -> agent resumes on its own
            if datetime.now(timezone.utc) - ts > timedelta(hours=24):
                m.muted = False
                db.commit()
                print(f"[AI UNMUTE] 24h passed, resuming for {sender_phone}")
                return False
            return True

        # Human Takeover check: owner replied manually -> AI mutes for this chat
        if from_me:
            if prospect:
                print(f"[AI MUTE PROTOCOL] Human replied to {sender_phone}. Muting AI.")
                prospect.ai_muted = True
            try:
                m = db.query(models.TakeoverMute).filter(
                    models.TakeoverMute.user_id == user_id,
                    models.TakeoverMute.sender_phone == sender_phone).first()
                if not m:
                    m = models.TakeoverMute(user_id=user_id, sender_phone=sender_phone, muted=True)
                    db.add(m)
                else:
                    m.muted = True
            except Exception as e:
                print(f"[AI MUTE] mute-save fail: {e}")
            db.commit()
            return {"status": "muted_or_ignored"}

        if _mute_active(db, user_id, sender_phone):
            print(f"[AI MUTED] Takeover mute active for {sender_phone}, ignoring")
            return {"status": "ignored"}

        if prospect and prospect.ai_muted:
            print(f"[AI MUTED] Ignored inbound message from {sender_phone}")
            return {"status": "ignored"}
        
        # Extract text based on how Baileys formats it
        conversation = msg.get("message", {}).get("conversation", "")
        extended_text = msg.get("message", {}).get("extendedTextMessage", {}).get("text", "")
        text = conversation or extended_text
        
        if text and sender_phone:
            print(f"NEW INBOUND FROM BAILEYS {sender_phone}: {text}")
            from backend.outreach_queue import is_opt_out, log_message
            if prospect:
                log_message(db, prospect.id, "INBOUND", text, "RECEIVED")
            if prospect and is_opt_out(text):
                prospect.pipeline_state = models.PipelineState.DO_NOT_CONTACT
                db.commit()
                print(f"[OPT-OUT] {sender_phone} -> DO_NOT_CONTACT")
                from backend.whatsapp_provider import send_whatsapp_message as _send
                _send(remote_jid, "Understood — we won't message you again.", user_id)
                return {"status": "opted-out"}
            from backend.agent import process_message
            from backend import plans as _plans3
            ok_ai, _ = _plans3.check_limit(db, user_id, "ai")
            if not ok_ai:
                # Plan AI quota spent: stay responsive with a canned reply (no AI cost).
                ai_reply = "Thanks for messaging! Our team will get back to you shortly."
            else:
                ai_reply = process_message(text, sender_phone, db, user_id)

            from backend.whatsapp_provider import send_whatsapp_message
            # Send to the full JID (LID-safe), not bare digits
            result = send_whatsapp_message(remote_jid, ai_reply, user_id)
            if prospect:
                try:
                    ok = isinstance(result, dict) and result.get("status") == "sent"
                    log_message(db, prospect.id, "OUTBOUND", ai_reply, "SENT" if ok else "FAILED")
                except Exception:
                    pass
            # Boss update: first live exchange per conversation — who messaged,
            # what they said, what AI answered. Once only (flagged).
            try:
                from backend.outreach_queue import get_admin_phone as _gap
                _admin = ""
                try:
                    _admin = _gap(db, user_id)
                except Exception:
                    _admin = ""
                if _admin and prospect:
                    _sig = dict(prospect.business_signals or {})
                    # START ping: once per conversation, and ONLY when the chat has
                    # substance (real intent or 2nd message) — never for a lone "hi".
                    # END ping below covers the close. Nothing in between. Ever.
                    if not _sig.get("boss_first_ping"):
                        _substance = False
                        _turns0 = 0
                        try:
                            _turns0 = db.query(models.Message).filter(
                                models.Message.prospect_id == prospect.id,
                                models.Message.direction == "INBOUND").count()
                            _mm0 = db.query(models.LeadMemory).filter(
                                models.LeadMemory.prospect_id == prospect.id).first()
                            _intent0 = (_mm0.intent if _mm0 else "") or ""
                            _substance = _turns0 >= 2 or _intent0 in (
                                "booking", "pricing", "question", "complaint")
                        except Exception:
                            pass
                        if _substance:
                            _sig["boss_first_ping"] = True
                            prospect.business_signals = _sig
                            db.commit()
                            _who = prospect.company_name or sender_phone
                            _ph = prospect.public_phone or sender_phone
                            _sum = (f"New reply from {_who} ({_ph}): "
                                    f"“{(text or '')[:160]}” — AI answered: “{(ai_reply or '')[:160]}”")
                            from backend.whatsapp_provider import send_whatsapp_message as _ping
                            _ping(_admin, _sum, user_id)
                    # Conversation-close wrap-up: client declines/defers or says
                    # goodbye after a real exchange -> one outcome ping to boss.
                    if not _sig.get("boss_close_ping"):
                        _tl = (text or "").lower()
                        _decline = any(w in _tl for w in (
                            "no need", "not now", "not interested", "no thanks",
                            "let you know", "call me later", "dont call",
                            "don't call", "leave it", "cancel"))
                        _turns = 0
                        try:
                            _turns = db.query(models.Message).filter(
                                models.Message.prospect_id == prospect.id,
                                models.Message.direction == "INBOUND").count()
                        except Exception:
                            pass
                        _farewell = _turns >= 2 and any(w in _tl for w in (
                            "bye", "thank", "ok", "fine", "done", "great"))
                        if _decline or _farewell:
                            _has_meeting = False
                            try:
                                _has_meeting = db.query(models.Meeting).filter(
                                    models.Meeting.prospect_id == prospect.id,
                                    models.Meeting.status == "BOOKED").count() > 0
                            except Exception:
                                pass
                            if not _has_meeting:
                                _outcome = "declined" if _decline else "closed"
                                _sig["boss_close_ping"] = True
                                prospect.business_signals = _sig
                                db.commit()
                                try:
                                    from backend import memory as _mem
                                    _mem.update_memory(
                                        db, user_id, prospect.id, text or "",
                                        booked_time="")
                                    _mm = db.query(models.LeadMemory).filter(
                                        models.LeadMemory.prospect_id == prospect.id).first()
                                    if _mm:
                                        _mm.temp = "COLD"
                                        _mm.next_action = "closed - archive"
                                        db.commit()
                                except Exception as _me:
                                    print(f"[BOSS-CLOSE] memory fail: {_me}")
                                _who = prospect.company_name or sender_phone
                                _ph = prospect.public_phone or sender_phone
                                _wrap = (f"Closed ({_outcome}): {_who} ({_ph}) — "
                                         f"last word: “{(text or '')[:160]}”. "
                                         f"{_turns} msg(s) exchanged.")
                                from backend.whatsapp_provider import send_whatsapp_message as _ping2
                                _ping2(_admin, _wrap, user_id)
            except Exception as _e:
                print(f"[BOSS-PING] fail: {_e}")

    except Exception as e:
        print(f"Baileys webhook error: {e}")
    return {"status": "ok"}

# --- DEMO: ADD PROSPECT ---
@app.post("/demo/add_prospect")
def add_demo_prospect(company: str, phone: str, db: Session = Depends(get_db)):
    prospect = models.Prospect(
        company_name=company,
        public_phone=phone,
        pipeline_state=models.PipelineState.QUALIFIED
    )
    db.add(prospect)
    db.commit()
    db.refresh(prospect)
    return prospect
