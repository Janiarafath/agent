"""Plan tiers + per-tenant daily metering (our-side counts: Groq exposes no spend API).
Tiers: free | starter (299) | growth (599) | pro (999). Enforced server-side.
"""
import os
from datetime import datetime
from zoneinfo import ZoneInfo
from sqlalchemy.orm import Session
from backend import models

KOLKATA = ZoneInfo("Asia/Kolkata")

TIERS = {
    "free":    {"price_inr": 0,   "messages_per_day": 0,    "ai_calls_per_day": 0},
    "starter": {"price_inr": 299, "messages_per_day": 30,   "ai_calls_per_day": 200},
    "growth":  {"price_inr": 599, "messages_per_day": 600,  "ai_calls_per_day": 3000},
    "pro":     {"price_inr": 999, "messages_per_day": 2000, "ai_calls_per_day": 10000},
}

# Closed beta: first seats free-for-all, then allowlist only.
MAX_USERS = int(os.getenv("MAX_USERS", "15") or 15)
ALLOWLIST = {e.strip().lower() for e in os.getenv("ALLOWLIST_EMAILS", "").split(",") if e.strip()}


def _today() -> str:
    return datetime.now(KOLKATA).strftime("%Y-%m-%d")


def get_plan(db: Session, user_id: str) -> str:
    try:
        s = db.query(models.UserSettings).filter(
            models.UserSettings.user_id == user_id).first()
        if s and (s.plan or "") in TIERS:
            return s.plan
    except Exception:
        pass
    return "free"


def _row(db: Session, user_id: str) -> models.Usage:
    day = _today()
    r = db.query(models.Usage).filter(
        models.Usage.user_id == user_id, models.Usage.day == day).first()
    if not r:
        r = models.Usage(user_id=user_id, day=day, messages_out=0, ai_calls=0)
        db.add(r)
        db.commit()
        db.refresh(r)
    return r


def check_limit(db: Session, user_id: str, kind: str) -> tuple[bool, str]:
    """kind: 'messages' | 'ai'. Returns (ok, reason). Never raises."""
    try:
        plan = get_plan(db, user_id)
        lim = TIERS.get(plan, TIERS["free"])
        used = _row(db, user_id)
        if kind == "messages" and used.messages_out >= lim["messages_per_day"]:
            return False, f"plan-{plan}-message-limit"
        if kind == "ai" and used.ai_calls >= lim["ai_calls_per_day"]:
            return False, f"plan-{plan}-ai-limit"
        return True, "ok"
    except Exception as e:
        print(f"[PLANS] check fail-open: {e}")
        return True, "ok"


def bump(db: Session, user_id: str, kind: str) -> None:
    try:
        r = _row(db, user_id)
        if kind == "messages":
            r.messages_out = (r.messages_out or 0) + 1
        elif kind == "ai":
            r.ai_calls = (r.ai_calls or 0) + 1
        db.commit()
    except Exception as e:
        print(f"[PLANS] bump fail: {e}")


def usage_summary(db: Session, user_id: str) -> dict:
    plan = get_plan(db, user_id)
    lim = TIERS.get(plan, TIERS["free"])
    try:
        r = _row(db, user_id)
        return {"plan": plan, "price_inr": lim["price_inr"],
                "messages_used": r.messages_out or 0,
                "messages_limit": lim["messages_per_day"],
                "ai_used": r.ai_calls or 0,
                "ai_limit": lim["ai_calls_per_day"]}
    except Exception:
        return {"plan": plan, "price_inr": lim["price_inr"],
                "messages_used": 0, "messages_limit": lim["messages_per_day"],
                "ai_used": 0, "ai_limit": lim["ai_calls_per_day"]}


def seats_left(db: Session) -> int:
    try:
        used = db.query(models.EarlyAccess).count()
        return max(0, MAX_USERS - used)
    except Exception:
        return MAX_USERS


def claim_seat(db: Session, user_id: str, email: str) -> tuple[bool, str]:
    """First touch per user: admit if seats remain or email allowlisted.
    Returns (ok, message). Never raises."""
    try:
        email = (email or "").strip().lower()
        row = db.query(models.EarlyAccess).filter(
            models.EarlyAccess.user_id == user_id).first()
        if row:
            if email and not row.email:
                row.email = email
                db.commit()
            return True, "ok"
        if email and email in ALLOWLIST:
            db.add(models.EarlyAccess(user_id=user_id, email=email))
            db.commit()
            return True, "ok"
        if db.query(models.EarlyAccess).count() >= MAX_USERS:
            return False, f"Early access is full ({MAX_USERS} pioneers). You're on the waitlist — we'll email {email or 'you'}."
        db.add(models.EarlyAccess(user_id=user_id, email=email))
        db.commit()
        return True, "ok"
    except Exception as e:
        print(f"[ACCESS] claim fail-open: {e}")
        return True, "ok"


def has_seat(db: Session, user_id: str) -> bool:
    try:
        return db.query(models.EarlyAccess).filter(
            models.EarlyAccess.user_id == user_id).first() is not None
    except Exception:
        return True  # fail open if DB hiccups; cap enforced at claim time
