"""Real meeting links + boss notification.
NOW: Jitsi — real, joinable instantly, zero credentials.
LATER: Google Meet via Calendar API once owner adds OAuth (GOOGLE_CLIENT_ID/SECRET).
Boss gets WhatsApp ping AND a dashboard row (meetings table).
"""
import os
import random
import string
from sqlalchemy.orm import Session
from backend import models


def _jitsi_link() -> str:
    rand = "".join(random.choices(string.ascii_lowercase + string.digits, k=10))
    return f"https://meet.jit.si/GrowthPilot-{rand}"


def generate_link(provider: str = "") -> tuple[str, str]:
    """Returns (link, provider_used). Google needs OAuth creds; falls back to Jitsi."""
    provider = provider or os.getenv("MEET_PROVIDER", "jitsi")
    if provider == "google" and os.getenv("GOOGLE_CLIENT_ID", "") and os.getenv("GOOGLE_CLIENT_SECRET", ""):
        # Full Calendar API booking lands here once OAuth is connected.
        # Safer to fall back than emit a dead link.
        pass
    return _jitsi_link(), "jitsi"


def book_meeting_for_prospect(db: Session, prospect: models.Prospect, meeting_time: str,
                              interest: str = "", user_id: str = "default_user") -> models.Meeting:
    """Creates Meeting row, marks prospect INTERESTED, pings boss on WhatsApp + dashboard."""
    link, provider = generate_link()
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

    # Notify boss on WhatsApp (their own linked number session sends to admin)
    try:
        from backend.whatsapp_provider import send_whatsapp_message
        admin_phone = os.getenv("ADMIN_PHONE_NUMBER", "")
        if admin_phone:
            send_whatsapp_message(
                admin_phone,
                f"HOT LEAD: {prospect.company_name} is interested"
                f"{' — ' + interest if interest else ''}. Agreed: {meeting_time}.\nJoin: {link}",
                user_id,
            )
    except Exception as e:
        print(f"[MEETINGS] boss ping fail: {e}")
    print(f"[MEETINGS] booked {prospect.company_name} @ {meeting_time} -> {link}")
    return meeting
