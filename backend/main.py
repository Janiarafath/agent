from fastapi import FastAPI, Request, Depends, HTTPException
from sqlalchemy.orm import Session
import os

from backend.database import engine, Base, get_db
from backend import models
from dotenv import load_dotenv

load_dotenv()

# Create database tables (For demo/initialization)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="GrowthPilot API")

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
                
                # 1. Wake up the Reply Agent to generate a response
                from backend.agent import generate_reply
                ai_reply = generate_reply(text)
                
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
