"""Capped outreach queue: approve-guard + daily cap + work-hours + STOP handling + audit log.
This is what keeps a 20-30/day prototype from getting the linked number banned instantly.
"""
from datetime import datetime, time as dtime
from zoneinfo import ZoneInfo
from sqlalchemy.orm import Session
from backend import models

DAILY_CAP_DEFAULT = 25
STOP_WORDS = {"stop", "unsubscribe", "opt out", "opt-out", "remove me", "don't message",
              "do not message", "stop messaging", "quit", "end",
              "لا تراسلني", "وقف", "إيقاف", "احذفني", "عدم الازعاج", "لا تزعجني"}

RIYADH = ZoneInfo("Asia/Riyadh")
KOLKATA = ZoneInfo("Asia/Kolkata")
DUBAI = ZoneInfo("Asia/Dubai")


def get_tz_for_location(location: str = ""):
    if not location:
        return RIYADH
    loc = location.lower()
    if any(k in loc for k in ["india", "chennai", "mumbai", "delhi", "bangalore", "bengaluru", "hyderabad", "kolkata", "pune", "kochi"]):
        return KOLKATA
    if any(k in loc for k in ["dubai", "abu dhabi", "uae", "qatar", "doha"]):
        return DUBAI
    return RIYADH


def is_opt_out(text: str) -> bool:
    if not text:
        return False
    t = text.strip().lower()
    return any(w in t for w in STOP_WORDS)


def sent_today_count(db: Session, user_id: str) -> int:
    today = datetime.now(RIYADH).date()
    start = datetime.combine(today, dtime.min).replace(tzinfo=RIYADH)
    rows = db.query(models.Message).filter(
        models.Message.channel == "WHATSAPP",
        models.Message.direction == "OUTBOUND",
    ).all()
    # Message has no user_id; filter by timestamp only (per-instance cap).
    # Per-user cap enforced at approve layer via prospect.user_id queue depth.
    n = 0
    for m in rows:
        ts = m.timestamp
        if ts is None:
            continue
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=RIYADH)
        if ts.astimezone(RIYADH) >= start:
            n += 1
    # prospects contacted today as fallback signal
    return n


def in_work_hours(now: datetime | None = None, location: str = "") -> bool:
    tz = get_tz_for_location(location)
    now = now or datetime.now(tz)
    if now.tzinfo is None:
        now = now.replace(tzinfo=tz)
    local = now.astimezone(tz)
    return 8 <= local.hour < 20


def can_send(db: Session, prospect: models.Prospect, user_id: str, cap: int = DAILY_CAP_DEFAULT):
    """Gate every cold send. Returns (ok, reason)."""
    if prospect.pipeline_state == models.PipelineState.DO_NOT_CONTACT:
        return False, "opted-out"
    if prospect.ai_muted:
        return False, "human-takeover-muted"
    sig = prospect.business_signals or {}
    if sig.get("whatsapp_exists") is False:
        return False, "not-on-whatsapp"
    if not prospect.public_phone:
        return False, "no-phone"
    if not in_work_hours(location=getattr(prospect, "location", "") or ""):
        return False, "outside-work-hours-recipient"
    if sent_today_count(db, user_id) >= cap:
        return False, f"daily-cap-{cap}-reached"
    return True, "ok"


def log_message(db: Session, prospect_id: int, direction: str, content: str, status: str = "SENT"):
    m = models.Message(prospect_id=prospect_id, channel="WHATSAPP",
                       direction=direction, content=content[:2000], status=status)
    db.add(m)
    db.commit()
    return m
