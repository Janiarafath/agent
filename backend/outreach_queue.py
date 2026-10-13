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


def _digits(s: str) -> str:
    return "".join(filter(str.isdigit, s or ""))


def same_number(a: str, b: str) -> bool:
    """Country-code-tolerant compare: match full digits or last-10 suffix."""
    da, db_ = _digits(a), _digits(b)
    if not da or not db_:
        return False
    if da == db_:
        return True
    return len(da) >= 10 and len(db_) >= 10 and da[-10:] == db_[-10:]


def get_admin_phone(db: Session, user_id: str) -> str:
    """Owner's boss number: this login's dashboard setting first, else the most
    recently saved number on ANY login (single-owner convenience), else env.
    Never hardcoded. Multi-tenant data stays per-user; this is only a fallback."""
    try:
        s = db.query(models.UserSettings).filter(
            models.UserSettings.user_id == user_id).first()
        if s and (s.admin_phone or "").strip():
            return s.admin_phone.strip()
        try:
            latest = db.query(models.UserSettings).filter(
                models.UserSettings.admin_phone != "").filter(
                models.UserSettings.admin_phone.isnot(None)).order_by(
                models.UserSettings.updated_at.desc()).first()
            # updated_at may be NULL on old rows; fall back to any row then
            if not latest or not (latest.admin_phone or "").strip():
                latest = db.query(models.UserSettings).filter(
                    models.UserSettings.admin_phone != "").first()
            if latest and (latest.admin_phone or "").strip():
                print(f"[ADMIN] fallback to number saved under another login")
                return latest.admin_phone.strip()
        except Exception:
            pass
    except Exception:
        pass
    import os as _os
    return (_os.getenv("ADMIN_PHONE_NUMBER", "") or "").strip()


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


def sent_last_hour_count(db: Session, user_id: str) -> int:
    """OUTBOUND WhatsApp sends by this user in the last 60 minutes.
    Joined via prospect so multi-tenant counts stay per-user."""
    from datetime import timedelta
    cutoff = datetime.now(RIYADH) - timedelta(hours=1)
    try:
        rows = db.query(models.Message).join(
            models.Prospect,
            models.Message.prospect_id == models.Prospect.id).filter(
            models.Message.channel == "WHATSAPP",
            models.Message.direction == "OUTBOUND",
            models.Prospect.user_id == user_id).all()
    except Exception:
        return 0
    n = 0
    for m in rows:
        ts = m.timestamp
        if ts is None:
            continue
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=RIYADH)
        if ts.astimezone(RIYADH) >= cutoff:
            n += 1
    return n


def warmup_cap(db: Session, user_id: str) -> int | None:
    """New senders ramp up (anti-ban): days 0-2 -> 5/day, days 3-6 -> 12/day.
    WARMUP_OFF=1 disables. Returns None when fully warmed."""
    import os as _os
    if _os.getenv("WARMUP_OFF", "0") == "1":
        return None
    try:
        row = db.query(models.EarlyAccess).filter(
            models.EarlyAccess.user_id == user_id).first()
        if not row or not row.created_at:
            return 5  # unknown age: be safe
        ts = row.created_at
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=RIYADH)
        age_days = (datetime.now(RIYADH) - ts.astimezone(RIYADH)).days
        if age_days < 3:
            return 5
        if age_days < 7:
            return 12
        return None
    except Exception:
        return None


HOURLY_CAP_DEFAULT = 6


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
    import os as _os
    # Default ON: B2B cold sends only 8am-8pm recipient time. Night blasts are
    # the fastest way to get a sender number reviewed. Set ENFORCE_WORK_HOURS=0
    # to disable (not recommended).
    if _os.getenv("ENFORCE_WORK_HOURS", "1") == "1":
        if not in_work_hours(location=getattr(prospect, "location", "") or ""):
            return False, "outside-work-hours-recipient"
    if sent_today_count(db, user_id) >= cap:
        return False, f"daily-cap-{cap}-reached"
    import os as _os2
    hourly = int(_os2.getenv("HOURLY_CAP", str(HOURLY_CAP_DEFAULT)) or HOURLY_CAP_DEFAULT)
    if sent_last_hour_count(db, user_id) >= hourly:
        return False, f"hourly-cap-{hourly}-reached"
    wcap = warmup_cap(db, user_id)
    if wcap is not None and sent_today_count(db, user_id) >= wcap:
        return False, f"warmup-cap-{wcap}-reached"
    return True, "ok"


def log_message(db: Session, prospect_id: int, direction: str, content: str, status: str = "SENT"):
    m = models.Message(prospect_id=prospect_id, channel="WHATSAPP",
                       direction=direction, content=content[:2000], status=status)
    db.add(m)
    db.commit()
    return m
