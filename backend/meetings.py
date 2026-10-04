"""Real meeting links + boss notification.
Providers: zoom (Server-to-Server OAuth, default once creds added), jitsi (zero-cred fallback).
Google Meet slot stays open for later (needs OAuth client).
Boss gets WhatsApp ping AND a dashboard row (meetings table).
"""
import base64
import os
import random
import re
import string
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from sqlalchemy.orm import Session
from backend import models

import requests

_zoom_token_cache: dict = {}


def _jitsi_link() -> str:
    rand = "".join(random.choices(string.ascii_lowercase + string.digits, k=10))
    return f"https://meet.jit.si/GrowthPilot-{rand}"


def _zoom_token() -> str:
    """Server-to-Server OAuth: account_credentials grant. Cached till expiry."""
    if _zoom_token_cache.get("exp", 0) > datetime.now().timestamp() + 60:
        return _zoom_token_cache["token"]
    account_id = os.getenv("ZOOM_ACCOUNT_ID", "")
    client_id = os.getenv("ZOOM_CLIENT_ID", "")
    client_secret = os.getenv("ZOOM_CLIENT_SECRET", "")
    if not (account_id and client_id and client_secret):
        raise RuntimeError("zoom creds missing")
    basic = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
    r = requests.post(
        "https://zoom.us/oauth/token",
        params={"grant_type": "account_credentials", "account_id": account_id},
        headers={"Authorization": f"Basic {basic}"},
        timeout=15,
    )
    r.raise_for_status()
    j = r.json()
    _zoom_token_cache["token"] = j["access_token"]
    _zoom_token_cache["exp"] = datetime.now().timestamp() + int(j.get("expires_in", 3500))
    return _zoom_token_cache["token"]


def _parse_start_utc(meeting_time: str) -> str | None:
    """Best-effort 'tomorrow at 2 PM' (IST) -> UTC ISO for Zoom. None if unparseable."""
    try:
        t = (meeting_time or "").lower()
        base = datetime.now(ZoneInfo("Asia/Kolkata"))
        day = base
        if "tomorrow" in t:
            day = base + timedelta(days=1)
        elif "today" in t:
            day = base
        m = re.search(r"(\d{1,2})(?::(\d{2}))?\s*(am|pm)", t)
        if not m:
            return None
        hh, mm, ap = int(m.group(1)), int(m.group(2) or 0), m.group(3)
        if ap == "pm" and hh < 12:
            hh += 12
        if ap == "am" and hh == 12:
            hh = 0
        local = day.replace(hour=hh, minute=mm, second=0, microsecond=0)
        if local <= base:
            local = local + timedelta(days=1)
        return local.astimezone(ZoneInfo("UTC")).strftime("%Y-%m-%dT%H:%M:%SZ")
    except Exception:
        return None


def _zoom_link(topic: str, meeting_time: str) -> str:
    token = _zoom_token()
    start = _parse_start_utc(meeting_time)
    payload: dict = {"topic": topic[:200], "type": 2 if start else 1,
                     "settings": {"join_before_host": True, "waiting_room": False}}
    if start:
        payload["start_time"] = start
        payload["duration"] = 30
        payload["timezone"] = "Asia/Kolkata"
    r = requests.post("https://api.zoom.us/v2/users/me/meetings", json=payload,
                      headers={"Authorization": f"Bearer {token}"}, timeout=20)
    r.raise_for_status()
    j = r.json()
    return j["join_url"]


def generate_link(provider: str = "", topic: str = "GrowthPilot intro call",
                  meeting_time: str = "") -> tuple[str, str]:
    """Returns (link, provider_used). Zoom first if creds present, else Jitsi."""
    provider = provider or os.getenv("MEET_PROVIDER", "jitsi")
    if provider == "zoom":
        try:
            return _zoom_link(topic, meeting_time), "zoom"
        except Exception as e:
            print(f"[MEETINGS] zoom fail, jitsi fallback: {e}")
    if provider == "google" and os.getenv("GOOGLE_CLIENT_ID", "") and os.getenv("GOOGLE_CLIENT_SECRET", ""):
        pass  # Calendar API booking lands here once OAuth is connected
    return _jitsi_link(), "jitsi"


def book_meeting_for_prospect(db: Session, prospect: models.Prospect, meeting_time: str,
                              interest: str = "", user_id: str = "default_user") -> models.Meeting:
    """Creates Meeting row, marks prospect INTERESTED, pings boss on WhatsApp + dashboard."""
    link, provider = generate_link(
        topic=f"GrowthPilot intro — {prospect.company_name}",
        meeting_time=meeting_time,
    )
    meeting = models.Meeting(
        user_id=user_id,
        prospect_id=prospect.id,
        meeting_time=meeting_time,
        meet_link=link,
        provider=provider,
        interest=interest or "Agreed to intro call",
        status="BOOKED",
    )
    db.add(meeting)
    prospect.pipeline_state = models.PipelineState.INTERESTED
    sig = dict(prospect.business_signals or {})
    sig["meeting_link"] = link
    sig["meeting_time"] = meeting_time
    prospect.business_signals = sig
    db.commit()
    db.refresh(meeting)

    # Notify boss on WhatsApp (number set by owner in dashboard Settings).
    try:
        from backend.whatsapp_provider import send_whatsapp_message
        from backend.outreach_queue import get_admin_phone
        try:
            admin_phone = get_admin_phone(db, user_id)
        except Exception:
            admin_phone = os.getenv("ADMIN_PHONE_NUMBER", "")
        if admin_phone:
            send_whatsapp_message(
                admin_phone,
                f"HOT LEAD: {prospect.company_name} is interested"
                f"{' — ' + interest if interest else ''}. Agreed: {meeting_time}.\nJoin: {link}",
                user_id,
            )
        else:
            print("[MEETINGS] no boss number set — dashboard only")
    except Exception as e:
        print(f"[MEETINGS] boss ping fail: {e}")
    print(f"[MEETINGS] booked {prospect.company_name} @ {meeting_time} -> {link}")
    return meeting
