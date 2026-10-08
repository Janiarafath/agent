"""Missed-lead recovery engine.
Detects: unanswered outreach, went-silent conversations, cold leftovers.
Scores HOT/WARM/COLD with reasons, drafts a recovery message (AI or template).
Owner approves/edits/sends — nothing auto-sends, ever.
"""
import os
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from backend import models


def _utcnow():
    return datetime.now(timezone.utc)


def _days_since(dt) -> float | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return (_utcnow() - dt).total_seconds() / 86400.0


def _last_inbound_days(db: Session, prospect_id: int) -> float | None:
    m = db.query(models.Message).filter(
        models.Message.prospect_id == prospect_id,
        models.Message.direction == "INBOUND").order_by(
        models.Message.id.desc()).first()
    return _days_since(m.timestamp) if m else None


def _memory(db: Session, user_id: str, prospect_id: int):
    return db.query(models.LeadMemory).filter(
        models.LeadMemory.user_id == user_id,
        models.LeadMemory.prospect_id == prospect_id).first()


def score_prospect(db: Session, p: models.Prospect) -> tuple[str, int, str, str] | None:
    """Returns (temp, score, reason, next_action) or None if no recovery needed."""
    if p.pipeline_state == models.PipelineState.DO_NOT_CONTACT:
        return None
    if p.ai_muted:
        return None
    mem = _memory(db, p.user_id, p.id)
    intent = (mem.intent if mem else "") or ""
    silent_days = _last_inbound_days(db, p.id)
    age_days = _days_since(p.created_at) or 0

    # Rule 1: booked meetings need no recovery
    if mem and mem.booking_status == "booked":
        return None
    # Rule 2: unanswered outreach (we wrote, they never replied, 1-14 days old)
    if p.pipeline_state in (models.PipelineState.CONTACTED, models.PipelineState.WAITING) \
            and silent_days is None and 1 <= age_days <= 14:
        if intent in ("booking", "pricing") or (mem and mem.lead_score >= 55):
            return ("HOT", 70, "showed interest, then went quiet", "send a warm nudge today")
        return ("WARM", 45, "outreach unanswered", "send one polite follow-up")
    # Rule 3: went silent after replying (3-21 days)
    if silent_days is not None and 3 <= silent_days <= 21 \
            and p.pipeline_state in (models.PipelineState.REPLIED, models.PipelineState.WAITING,
                                     models.PipelineState.INTERESTED):
        if intent in ("booking", "pricing", "complaint") or (mem and mem.lead_score >= 55):
            return ("HOT", 80, f"hot conversation cooling ({int(silent_days)}d silent)",
                    "recover today with a personal note")
        return ("WARM", 50, f"conversation cooling ({int(silent_days)}d silent)",
                "send a check-in this week")
    # Rule 4: stale leftovers (older than 21d, still in play) -> COLD nurture
    if age_days > 21 and p.pipeline_state in (models.PipelineState.NEW,
                                              models.PipelineState.OUTREACH_READY,
                                              models.PipelineState.CONTACTED,
                                              models.PipelineState.WAITING,
                                              models.PipelineState.REPLIED):
        return ("COLD", 20, "stale lead, low priority", "one light re-engagement or archive")
    return None


def detect_candidates(db: Session, user_id: str, limit: int = 50):
    """All prospects worth a recovery nudge, hottest first."""
    prospects = db.query(models.Prospect).filter(
        models.Prospect.user_id == user_id).all()
    out = []
    for p in prospects:
        if not p.public_phone:
            continue
        s = score_prospect(db, p)
        if s:
            temp, score, reason, action = s
            out.append({"prospect": p, "temp": temp, "score": score,
                        "reason": reason, "next_action": action})
    order = {"HOT": 0, "WARM": 1, "COLD": 2}
    out.sort(key=lambda r: (order.get(r["temp"], 3), -r["score"]))
    return out[:limit]


_FALLBACKS = [
    "Hi {name}! Just checking in — happy to help whenever you're ready. Want a quick call this week?",
    "Hello {name}! Noticed we lost touch. Anything I can help with?",
]


def draft_recovery(db: Session, user_id: str, prospect: models.Prospect,
                   temp: str, reason: str) -> str:
    """AI-personalized draft, template fallback. Never raises."""
    name = (prospect.company_name or "there").split("|")[0].strip()[:40]
    mem = _memory(db, user_id, prospect.id)
    context_bits = []
    if mem:
        if mem.service:
            context_bits.append(f"interested in: {mem.service}")
        if mem.preferred_datetime:
            context_bits.append(f"mentioned: {mem.preferred_datetime}")
        if mem.intent:
            context_bits.append(f"intent: {mem.intent}")
    context_bits.append(f"situation: {reason}")
    key = os.getenv("GROQ_API_KEY", "")
    if key:
        try:
            from groq import Groq
            client = Groq(api_key=key)
            prompt = (f"Write ONE short warm WhatsApp follow-up (max 2 sentences) to '{name}'. "
                      f"Facts: {'; '.join(context_bits)}. "
                      f"Goal: restart the conversation, offer one specific next step. "
                      f"No placeholders, no brackets, output ONLY the message.")
            r = client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model=os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b"),
                max_tokens=120)
            text = (r.choices[0].message.content or "").strip()
            if text and "http" not in text.lower():
                return text
        except Exception as e:
            print(f"[RECOVERY] draft AI fail: {e}")
    import random
    return random.choice(_FALLBACKS).format(name=name)


def run_scan(db: Session, user_id: str) -> dict:
    """Detect + score + create pending drafts (dedupes open ones). Returns counts."""
    counts = {"HOT": 0, "WARM": 0, "COLD": 0, "drafts": 0}
    for cand in detect_candidates(db, user_id):
        p = cand["prospect"]
        counts[cand["temp"]] += 1
        exists = db.query(models.RecoveryDraft).filter(
            models.RecoveryDraft.user_id == user_id,
            models.RecoveryDraft.prospect_id == p.id,
            models.RecoveryDraft.status == "pending").first()
        if exists:
            continue
        draft = draft_recovery(db, user_id, p, cand["temp"], cand["reason"])
        db.add(models.RecoveryDraft(
            user_id=user_id, prospect_id=p.id, temp=cand["temp"],
            score=cand["score"], reason=cand["reason"],
            next_action=cand["next_action"], draft=draft, status="pending"))
        counts["drafts"] += 1
        try:
            mem = _memory(db, user_id, p.id)
            if mem:
                mem.temp = cand["temp"]
        except Exception:
            pass
    db.commit()
    print(f"[RECOVERY] scan for {user_id}: {counts}")
    return counts
