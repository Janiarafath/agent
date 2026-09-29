from fastapi import FastAPI, Request, Depends, HTTPException
from sqlalchemy.orm import Session
import os

from database import engine, Base, get_db
import models
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
    
    # 1. Parse incoming message (Meta webhook format)
    # 2. Find prospect in DB by phone number
    # 3. Save Message to DB (INBOUND)
    # 4. Update PipelineState to REPLIED (Halts Celery Follow-ups)
    # 5. Trigger Reply Agent (Celery Task) to classify and draft response
    
    print(f"Received Webhook Data: {data}")
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
