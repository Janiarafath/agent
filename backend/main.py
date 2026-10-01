from fastapi import FastAPI, Request, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
import os

from backend.database import engine, Base, get_db
from backend import models
from dotenv import load_dotenv

load_dotenv()

# Create database tables (For demo/initialization)
Base.metadata.create_all(bind=engine)

from backend.scheduler import start_scheduler, run_autonomous_discovery
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting Background Scheduler...")
    start_scheduler()
    yield
    print("Shutting down Scheduler...")

app = FastAPI(title="GrowthPilot API", lifespan=lifespan)

from pydantic import BaseModel

class DiscoveryRequest(BaseModel):
    query: str = "companies looking for b2b saas solutions"

@app.post("/api/trigger-discovery")
def trigger_discovery(request: DiscoveryRequest, background_tasks: BackgroundTasks):
    """Allows the Next.js Dashboard to instantly force a Discovery Run with a custom query"""
    # Pass the query to the background job
    background_tasks.add_task(run_autonomous_discovery, request.query)
    return {"status": f"Discovery Queued for: {request.query}"}

from backend.scheduler import run_autonomous_followups
from backend.whatsapp_provider import send_whatsapp_message

@app.post("/api/trigger-followups")
def trigger_followups(background_tasks: BackgroundTasks):
    """Instantly forces the Follow-up Engine to scan and text non-repliers"""
    background_tasks.add_task(run_autonomous_followups)
    return {"status": "Follow-up Engine Queued!"}

@app.post("/api/approve/{prospect_id}")
def approve_outreach(prospect_id: int, db: Session = Depends(get_db)):
    """Approves a drafted message and sends it via WhatsApp"""
    prospect = db.query(models.Prospect).filter(models.Prospect.id == prospect_id).first()
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")
        
    draft = prospect.business_signals.get("draft_message", "Hello!")
    
    # For demo purposes, we send the message to the CEO's test number so they can see it!
    admin_phone = os.getenv("ADMIN_PHONE_NUMBER", "918148647818")
    send_whatsapp_message(admin_phone, f"[To: {prospect.company_name}] {draft}")
    
    prospect.pipeline_state = models.PipelineState.CONTACTED
    db.commit()
    return {"status": "Sent!"}

from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/dashboard")
def get_dashboard_data(db: Session = Depends(get_db)):
    prospects = db.query(models.Prospect).all()
    metrics = {
        "total_leads": len(prospects),
        "new": sum(1 for p in prospects if p.pipeline_state == models.PipelineState.NEW),
        "researching": sum(1 for p in prospects if p.pipeline_state == models.PipelineState.RESEARCHING),
        "outreach_ready": sum(1 for p in prospects if p.pipeline_state == models.PipelineState.OUTREACH_READY),
        "replied": sum(1 for p in prospects if p.pipeline_state == models.PipelineState.REPLIED)
    }
    return {"metrics": metrics, "pipeline": prospects}

# --- WHATSAPP CLOUD API SETUP ---
WHATSAPP_VERIFY_TOKEN = os.getenv("WHATSAPP_VERIFY_TOKEN", "demo_verify_token")
WHATSAPP_API_TOKEN = os.getenv("WHATSAPP_API_TOKEN", "")

@app.get("/")
def read_root():
    return {"status": "GrowthPilot Backend Alive", "mode": "Demo" if not WHATSAPP_API_TOKEN else "Production"}

# --- WHATSAPP WEBHOOK (VERIFICATION) ---
@app.get("/webhook/whatsapp")
def verify_whatsapp(request: Request):
    """
    Required by Meta to verify the Webhook URL for the WhatsApp Cloud API.
    """
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")

    if mode == "subscribe" and token == WHATSAPP_VERIFY_TOKEN:
        return int(challenge)
    raise HTTPException(status_code=403, detail="Invalid verification token")

# --- WHATSAPP WEBHOOK (RECEIVE MESSAGES) ---
@app.post("/webhook/whatsapp")
async def receive_whatsapp(request: Request, db: Session = Depends(get_db)):
    """
    Receives real-time inbound messages from prospects.
    This wakes up the Reply Agent and halts follow-ups!
    """
    data = await request.json()
    
    try:
        # WhatsApp Webhooks have a deeply nested JSON structure
        entry = data.get('entry', [])[0]
        changes = entry.get('changes', [])[0]
        value = changes.get('value', {})
        
        # Check if this is an actual message (and not a status update like 'delivered' or 'read')
        if 'messages' in value:
            msg = value['messages'][0]
            sender_phone = msg['from']
            
            # Extract text if it's a text message
            if msg.get('type') == 'text':
                text = msg['text']['body']
                print(f"NEW INBOUND MESSAGE from {sender_phone}: {text}")
                
                # 1. Wake up the Agent to process the message
                from backend.agent import process_message
                ai_reply = process_message(text, sender_phone, db)
                
                # 2. Send the message back via Meta API
                from backend.whatsapp_provider import send_whatsapp_message
                send_whatsapp_message(sender_phone, ai_reply)
                
    except Exception as e:
        print(f"Webhook processing error: {e}")
        # Meta expects a 200 OK even if we fail, otherwise they keep retrying
        
    return {"status": "received"}

# --- DEMO: ADD PROSPECT ---
@app.post("/demo/add_prospect")
def add_demo_prospect(company: str, phone: str, db: Session = Depends(get_db)):
    prospect = models.Prospect(
        company_name=company,
        public_phone=phone,
        pipeline_state=models.PipelineState.QUALIFIED
    )
    db.add(prospect)
    db.commit()
    db.refresh(prospect)
    return prospect
