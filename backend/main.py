from fastapi import FastAPI, Request, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
import os

from backend.database import engine, Base, get_db
from backend import models
from dotenv import load_dotenv
from pathlib import Path as _Path

# Load repo-root .env by absolute path (robust to any working directory)
load_dotenv(dotenv_path=_Path(__file__).resolve().parent.parent / ".env")

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
    background_tasks.add_task(run_lead_pipeline, request.category, request.city, request.user_id, request.max_results)
    return {"status": f"Auto-discovery queued: {request.category} in {request.city}"}

@app.post("/api/trigger-discovery")
def trigger_discovery(request: DiscoveryRequest, background_tasks: BackgroundTasks):
    """Allows the Next.js Dashboard to instantly force a Discovery Run with a custom query"""
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


@app.post("/api/settings")
def save_settings(request: SettingsRequest, db: Session = Depends(get_db)):
    """Save owner settings from dashboard (boss WhatsApp number, plan)."""
    from backend import plans as _plans
    s = db.query(models.UserSettings).filter(models.UserSettings.user_id == request.user_id).first()
    if not s:
        s = models.UserSettings(user_id=request.user_id, admin_phone="", plan="free")
        db.add(s)
    if request.admin_phone is not None:
        s.admin_phone = "".join(filter(str.isdigit, request.admin_phone or ""))
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


@app.get("/api/profile")
def get_profile(user_id: str, db: Session = Depends(get_db)):
    """Business profile the AI receptionist answers from."""
    p = db.query(models.BusinessProfile).filter(
        models.BusinessProfile.user_id == user_id).first()
    if not p:
        return {"business_name": "", "industry": "", "services": "", "pricing": "",
                "hours": "", "location": "", "faq": [], "tone": ""}
    return {"business_name": p.business_name or "", "industry": p.industry or "",
            "services": p.services or "", "pricing": p.pricing or "",
            "hours": p.hours or "", "location": p.location or "",
            "faq": p.faq or [], "tone": p.tone or ""}


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
def trigger_recovery(user_id: str, background_tasks: BackgroundTasks):
    """Queue a recovery scan (detect + score + draft). Results land as pending."""
    from backend.scheduler import run_recovery_scan
    background_tasks.add_task(run_recovery_scan, user_id)
    return {"status": f"Recovery scan queued for {user_id}"}


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
        sender_phone_with_device = remote_jid.split("@")[0]
        sender_phone = sender_phone_with_device.split(":")[0]

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
