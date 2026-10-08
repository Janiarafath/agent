"""Cheap conversation memory: regex/keyword extraction, zero extra AI calls.
Bumped on every inbound turn + on booking. Phase 2 scorer refines temp/score.
"""
from sqlalchemy.orm import Session
from backend import models


def _intent(text: str) -> str:
    t = (text or "").lower()
    if any(w in t for w in ("book", "appointment", "slot", "schedule", "visit", "meet")):
        return "booking"
    if any(w in t for w in ("price", "cost", "charge", "fee", "rate", "discount", "offer")):
        return "pricing"
    if any(w in t for w in ("time", "open", "hours", "when", "location", "where", "address")):
        return "question"
    if any(w in t for w in ("complaint", "bad", "worst", "refund", "angry", "rude", "late")):
        return "complaint"
    return "other"


def _service(text: str, profile_services: str) -> str:
    t = (text or "").lower()
    for line in (profile_services or "").replace(",", "\n").split("\n"):
        s = line.strip().strip("-•* ").lower()
        if len(s) > 3 and s in t:
            return line.strip().strip("-•* ")
    return ""


def _score(intent: str, agreed_time: bool, booked: bool) -> tuple[int, str]:
    if booked:
        return 95, "HOT"
    if agreed_time or intent == "booking":
        return 75, "HOT"
    if intent == "pricing":
        return 55, "WARM"
    if intent == "question":
        return 35, "WARM"
    if intent == "complaint":
        return 60, "HOT"
    return 15, "COLD"


def update_memory(db: Session, user_id: str, prospect_id: int, user_message: str,
                  service_hint: str = "", booked_time: str = "") -> models.LeadMemory:
    """Upsert structured memory for this turn. Never raises."""
    try:
        mem = db.query(models.LeadMemory).filter(
            models.LeadMemory.user_id == user_id,
            models.LeadMemory.prospect_id == prospect_id).first()
        if not mem:
            mem = models.LeadMemory(user_id=user_id, prospect_id=prospect_id)
            db.add(mem)
        intent = _intent(user_message)
        if intent != "other" or not mem.intent:
            mem.intent = intent
        try:
            from backend.agent import _extract_time
            dt = _extract_time(user_message or "")
        except Exception:
            dt = None
        if booked_time:
            mem.preferred_datetime = booked_time
            mem.booking_status = "booked"
        elif dt:
            mem.preferred_datetime = dt
            if mem.booking_status != "booked":
                mem.booking_status = "pending"
        if service_hint:
            mem.service = service_hint
        score, temp = _score(mem.intent or intent, bool(dt or booked_time),
                            (mem.booking_status == "booked"))
        mem.lead_score = score
        mem.temp = temp
        mem.next_action = {"HOT": "reply fast / confirm booking",
                           "WARM": "follow up with details",
                           "COLD": "nurture later"}[temp]
        db.commit()
        db.refresh(mem)
        return mem
    except Exception as e:
        print(f"[MEMORY] update fail: {e}")
        try:
            db.rollback()
        except Exception:
            pass
        return None
