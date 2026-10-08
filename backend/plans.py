"""Plan tiers + per-tenant daily metering (our-side counts: Groq exposes no spend API).
Tiers: free | starter (299) | growth (599) | pro (999). Enforced server-side.
"""
from datetime import datetime
from zoneinfo import ZoneInfo
from sqlalchemy.orm import Session
from backend import models

KOLKATA = ZoneInfo("Asia/Kolkata")

TIERS = {
    "free":    {"price_inr": 0,   "messages_per_day": 25,   "ai_calls_per_day": 200},
    "starter": {"price_inr": 299, "messages_per_day": 200,  "ai_calls_per_day": 1000},
    "growth":  {"price_inr": 599, "messages_per_day": 600,  "ai_calls_per_day": 3000},
    "pro":     {"price_inr": 999, "messages_per_day": 2000, "ai_calls_per_day": 10000},
}


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
