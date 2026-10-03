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
    provider = Column(String, default="jitsi")  # "jitsi" | "google"
    interest = Column(String, default="")  # why they're interested / sentiment
    status = Column(String, default="BOOKED")  # BOOKED | DONE | CANCELLED

    created_at = Column(DateTime(timezone=True), server_default=func.now())
