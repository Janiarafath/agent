from sqlalchemy import Column, Integer, String, Boolean, JSON, DateTime, Enum, ForeignKey
from sqlalchemy.sql import func
import enum
from backend.database import Base

# The deterministic state machine from Rule #6
class PipelineState(str, enum.Enum):
    NEW = "NEW"
    RESEARCHING = "RESEARCHING"
    QUALIFIED = "QUALIFIED"
    OUTREACH_READY = "OUTREACH_READY"
    CONTACTED = "CONTACTED"
    WAITING = "WAITING"
    REPLIED = "REPLIED"
    INTERESTED = "INTERESTED"
    PROPOSAL = "PROPOSAL"
    WON = "WON"
    LOST = "LOST"
    DO_NOT_CONTACT = "DO_NOT_CONTACT"

class Prospect(Base):
    __tablename__ = "prospects"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, default="default_user") # Firebase Auth UID
    company_name = Column(String, index=True)
    website = Column(String)
    industry = Column(String)
    location = Column(String)
    
    # Discovered Contact Info
    public_email = Column(String, nullable=True)
    public_phone = Column(String, nullable=True) # WhatsApp number
    
    # Qualification & AI Research
    score = Column(Integer, default=0)
    business_signals = Column(JSON, default=dict) # Evidence gathered by AI
    ai_muted = Column(Boolean, default=False) # Human Takeover Protocol flag
    
    # State Machine
    pipeline_state = Column(Enum(PipelineState), default=PipelineState.NEW)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    prospect_id = Column(Integer, ForeignKey("prospects.id"))
    
    channel = Column(String) # "WHATSAPP" or "EMAIL"
    direction = Column(String) # "INBOUND" or "OUTBOUND"
    
    content = Column(String)
    status = Column(String) # "SENT", "DELIVERED", "READ", "FAILED", "DRAFT"
    
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

class Meeting(Base):
    """Booked meeting: real joinable link + interest intel for boss dashboard."""
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, default="default_user")
    prospect_id = Column(Integer, ForeignKey("prospects.id"))

    meeting_time = Column(String)  # as agreed, e.g. "tomorrow at 2 PM"
    meet_link = Column(String)     # real joinable URL (jitsi now, google when OAuth added)
    provider = Column(String, default="jitsi")  # "jitsi" | "zoom" | "google"
    interest = Column(String, default="")  # why they're interested / sentiment
    status = Column(String, default="BOOKED")  # BOOKED | DONE | CANCELLED

    created_at = Column(DateTime(timezone=True), server_default=func.now())

class UserSettings(Base):
    """Per-owner settings managed from the dashboard (boss alert number, ...)."""
    __tablename__ = "user_settings"

    user_id = Column(String, primary_key=True)
    admin_phone = Column(String, default="")  # boss WhatsApp number for HOT LEAD pings
    plan = Column(String, default="free")  # free | starter | growth | pro
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class TakeoverMute(Base):
    """Human-takeover mute per sender. Owner replied manually -> AI stays quiet.
    Auto-expires after 24h so the agent resumes without manual unmute."""
    __tablename__ = "takeover_mutes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, default="default_user")
    sender_phone = Column(String, index=True)
    muted = Column(Boolean, default=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class BusinessProfile(Base):
    """The business the AI receptionist speaks for. Grounds replies so pricing/
    hours/services are never hallucinated: only answer from here, else deflect."""
    __tablename__ = "business_profiles"

    user_id = Column(String, primary_key=True)
    business_name = Column(String, default="")
    industry = Column(String, default="")  # dental | salon | real_estate | coaching | restaurant | other
    services = Column(String, default="")  # free text list
    pricing = Column(String, default="")  # publishable pricing, "" = do not quote
    hours = Column(String, default="")
    location = Column(String, default="")
    faq = Column(JSON, default=list)  # [{"q": "...", "a": "..."}]
    tone = Column(String, default="warm, brief, human")
    avg_deal_inr = Column(Integer, default=5000)  # for pipeline estimates
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class JobRun(Base):
    """Campaign/progress tracking so the dashboard shows live status, not silence."""
    __tablename__ = "job_runs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, default="default_user")
    kind = Column(String, default="discover")  # discover | recovery | followups
    status = Column(String, default="queued")  # queued | running | done | failed
    stage = Column(String, default="")  # searching | verifying | drafting | ...
    total = Column(Integer, default=0)
    done_count = Column(Integer, default=0)
    result = Column(String, default="")  # human summary, e.g. "12 leads ready"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class LeadMemory(Base):
    """Structured conversation memory per lead. Updated cheaply (no extra AI call)."""
    __tablename__ = "lead_memory"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, default="default_user")
    prospect_id = Column(Integer, ForeignKey("prospects.id"), index=True)
    intent = Column(String, default="")  # question | booking | pricing | complaint | other
    service = Column(String, default="")
    preferred_datetime = Column(String, default="")
    booking_status = Column(String, default="none")  # none | pending | booked
    lead_score = Column(Integer, default=0)  # 0-100 heuristic
    temp = Column(String, default="COLD")  # HOT | WARM | COLD (Phase 2 scorer refines)
    next_action = Column(String, default="")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Usage(Base):
    """Per-tenant daily metering for plan enforcement (our-side counts)."""
    __tablename__ = "usage"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)
    day = Column(String, index=True)  # YYYY-MM-DD (Asia/Kolkata)
    messages_out = Column(Integer, default=0)
    ai_calls = Column(Integer, default=0)

class RecoveryDraft(Base):
    """Missed-lead recovery: scored opportunity + owner-approved message.
    Flow: pending -> (edited) -> approved/sent | skipped."""
    __tablename__ = "recovery_drafts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, default="default_user")
    prospect_id = Column(Integer, ForeignKey("prospects.id"), index=True)
    temp = Column(String, default="WARM")  # HOT | WARM | COLD
    score = Column(Integer, default=0)
    reason = Column(String, default="")  # why this lead needs recovery
    next_action = Column(String, default="")
    draft = Column(String, default="")  # editable message text
    status = Column(String, default="pending")  # pending | sent | skipped
    created_at = Column(DateTime(timezone=True), server_default=func.now())
