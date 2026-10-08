import os
from apscheduler.schedulers.background import BackgroundScheduler
from backend.database import SessionLocal
from backend import models
from tavily import TavilyClient
import google.generativeai as genai

def run_autonomous_discovery(search_query: str = "companies looking for b2b saas solutions", user_id: str = "default_user"):
    """The background job that finds leads and drafts outreach autonomously."""
    print(f"[AUTONOMOUS AGENT] Waking up to run daily discovery for: {search_query} (User: {user_id})...")
    db = SessionLocal()
    
    try:
        tavily_key = os.getenv("TAVILY_API_KEY")
        if not tavily_key:
            print("[AUTONOMOUS AGENT] Missing Tavily API Key. Generating Mock Data for Demo purposes.")
            results = [
                {"title": "TechNova Solutions", "url": "technova.com", "content": "Looking for entry level AI engineers."},
                {"title": "CloudSync AI", "url": "cloudsync.ai", "content": "Hiring freshers in Chennai for software roles."},
                {"title": "DataFlow Corp", "url": "dataflow.com", "content": "We need B2B SaaS solutions and fresh developers."}
            ]
        else:
            tavily = TavilyClient(api_key=tavily_key)
            print(f"[AUTONOMOUS AGENT] Searching Tavily for: {search_query}")
            search_response = tavily.search(query=search_query, search_depth="basic", max_results=3)
            results = search_response.get('results', [])
        
        from groq import Groq
        groq_api_key = os.getenv("GROQ_API_KEY", "")
        groq_client = Groq(api_key=groq_api_key) if groq_api_key else None
            
        leads_added = 0
        for res in results:
            company_name = res.get('title', 'Unknown Company')[:50]
            website = res.get('url', 'No URL')
            snippet = res.get('content', '')[:150]
            
            # Check if exists for this user
            existing = db.query(models.Prospect).filter(models.Prospect.website == website, models.Prospect.user_id == user_id).first()
            if existing:
                continue
                
            print(f"[AUTONOMOUS AGENT] Found new lead for {user_id}: {company_name}")
            
            # Draft personalized outreach
            draft = "Hi, saw your company and would love to connect."
            if groq_client:
                try:
                    prompt = f"Draft a 2-sentence highly personalized casual cold WhatsApp message to a company named {company_name}. Here is what they do: {snippet}. Offer our AI Sales Automation service. Do not use placeholders or brackets. Output ONLY the raw message."
                    response = groq_client.chat.completions.create(
                        messages=[{"role": "user", "content": prompt}],
                        model=os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b"),
                    )
                    draft = response.choices[0].message.content.strip()
                except Exception as e:
                    print(f"Groq API Error: {e}")
            
            new_prospect = models.Prospect(
                user_id=user_id,
                company_name=company_name,
                website=website,
                public_phone="",  # unknown until research/verify — never hardcode own number (was self-DM bug)
                pipeline_state=models.PipelineState.NEW,
                business_signals={"source": "autonomous_loop", "snippet": snippet, "draft_message": draft}
            )
            db.add(new_prospect)
            leads_added += 1
            
        db.commit()
        print(f"[AUTONOMOUS AGENT] Successfully processed {leads_added} new leads. Going back to sleep.")
        
    except Exception as e:
        print(f"[AUTONOMOUS AGENT] Error during loop: {e}")
    finally:
        db.close()

def run_lead_pipeline(category: str = "dentists", city: str = "Riyadh, Saudi Arabia", user_id: str = "default_user", max_results: int = 25):
    """Autonomous: find (OSM+Places) -> normalize -> verify WhatsApp -> AI draft -> OUTREACH_READY."""
    print(f"[LEAD-PIPELINE] {category} in {city} for {user_id} ...")
    db = SessionLocal()
    try:
        from backend.discovery import discover_leads
        from backend.verify import is_whatsapp_registered
        leads = discover_leads(category, city, max_results=max_results)
        from groq import Groq
        groq_api_key = os.getenv("GROQ_API_KEY", "")
        groq_client = Groq(api_key=groq_api_key) if groq_api_key else None
        added = 0
        for lead in leads:
            phone = lead.get("public_phone", "")
            website = lead.get("website", "")
            if not phone and not website:
                continue
            existing = None
            if phone:
                existing = db.query(models.Prospect).filter(models.Prospect.public_phone == phone, models.Prospect.user_id == user_id).first()
            if not existing and website:
                existing = db.query(models.Prospect).filter(models.Prospect.website == website, models.Prospect.user_id == user_id).first()
            if existing:
                continue
            # verify WhatsApp existence (low-QPS, cached)
            wa_exists = None
            if phone:
                wa_exists = is_whatsapp_registered(phone, user_id)
                if wa_exists is False:
                    print(f"[LEAD-PIPELINE] skip non-WhatsApp {phone} ({lead.get('company_name')})")
                    continue
            draft = f"Hi {lead.get('company_name','')} — quick question about getting more customers via WhatsApp automation?"
            if groq_client:
                try:
                    prompt = f"Draft a 2-sentence highly personalized casual cold WhatsApp message to a business named {lead.get('company_name')}. Industry: {lead.get('industry')}. Address: {lead.get('address')}. Offer AI Sales Automation. No placeholders. Output ONLY raw message."
                    resp = groq_client.chat.completions.create(messages=[{"role": "user", "content": prompt}], model=os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b"))
                    draft = resp.choices[0].message.content.strip()
                except Exception as e:
                    print(f"Groq draft error: {e}")
            sig = {"source": lead.get("source"), "snippet": lead.get("snippet", "")[:200],
                   "draft_message": draft, "whatsapp_exists": wa_exists}
            p = models.Prospect(user_id=user_id, company_name=lead.get("company_name", "Unknown")[:80],
                                website=website, industry=lead.get("industry", category),
                                location=city, public_phone=phone,
                                public_email=lead.get("public_email", ""),
                                pipeline_state=models.PipelineState.OUTREACH_READY,
                                business_signals=sig)
            db.add(p)
            added += 1
        db.commit()
        print(f"[LEAD-PIPELINE] done: {added} new leads ready for approval.")
    except Exception as e:
        print(f"[LEAD-PIPELINE] error: {e}")
    finally:
        db.close()


# Start the scheduler
scheduler = BackgroundScheduler()

def run_autonomous_followups():
    """Scans the database for CONTACTED prospects and sends a polite follow-up."""
    print("[FOLLOW-UP ENGINE] Waking up to scan for non-repliers...")
    db = SessionLocal()
    
    try:
        # Find all prospects who were CONTACTED
        prospects = db.query(models.Prospect).filter(models.Prospect.pipeline_state == models.PipelineState.CONTACTED).all()
        
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-3.8-flash')
        else:
            model = None
            
        followups_sent = 0
        from backend.whatsapp_provider import send_whatsapp_message
        
        import time
        import random
        from groq import Groq
        
        # Initialize Groq client
        groq_api_key = os.getenv("GROQ_API_KEY", "")
        client = Groq(api_key=groq_api_key) if groq_api_key else None
        
        for p in prospects:
            if not p.public_phone:
                print(f"[FOLLOW-UP ENGINE] skip {p.company_name}: no phone")
                continue
            print(f"[FOLLOW-UP ENGINE] Drafting follow-up for {p.company_name} -> {p.public_phone}...")
            
            draft = f"Hi again! Just bubbling this up. Are you still looking for help at {p.company_name}?"
            if client:
                try:
                    prompt = f"Write exactly ONE SHORT SENTENCE to follow up with {p.company_name}. I previously emailed them about AI sales automation. STRICT RULE: Do NOT provide options. Do NOT output conversational filler like 'Here is your draft'. Just output the raw message text."
                    response = client.chat.completions.create(
                        messages=[{"role": "user", "content": prompt}],
                        model="qwen/qwen3.8-27b",
                    )
                    draft = response.choices[0].message.content.strip()
                except Exception as e:
                    print(f"Groq API Error: {e}")
            
            # Send the follow-up to the PROSPECT (was admin_phone demo = self-DM bug)
            from backend.outreach_queue import can_send as _can_send, log_message as _log
            from backend import plans as _plansf
            ok, reason = _can_send(db, p, p.user_id or "default_user")
            if not ok:
                print(f"[FOLLOW-UP ENGINE] skip {p.company_name}: {reason}")
                continue
            ok, reason = _plansf.check_limit(db, p.user_id or "default_user", "messages")
            if not ok:
                print(f"[FOLLOW-UP ENGINE] skip {p.company_name}: {reason}")
                continue
            send_whatsapp_message(p.public_phone, draft, p.user_id or "default_user")
            _log(db, p.id, "OUTBOUND", draft, "SENT")
            _plansf.bump(db, p.user_id or "default_user", "messages")
            
            # Update state to WAITING so we don't spam them every day
            p.pipeline_state = models.PipelineState.WAITING
            followups_sent += 1
            db.commit()
            
            # ANTI-BAN STRATEGY: Wait a random amount of time (2-5 minutes) between sending automated messages
            # so WhatsApp doesn't flag us as a bot.
            delay = random.randint(120, 300)
            print(f"[ANTI-BAN] Sleeping for {delay} seconds before sending the next message...")
            time.sleep(delay)
        print(f"[FOLLOW-UP ENGINE] Sent {followups_sent} follow-up messages.")
        
    except Exception as e:
        print(f"[FOLLOW-UP ENGINE] Error: {e}")
    finally:
        db.close()

# Run every day at 9 AM and 10 AM (for demo purposes)
scheduler.add_job(run_autonomous_discovery, 'cron', hour=9, minute=0)
scheduler.add_job(run_autonomous_followups, 'cron', hour=10, minute=0)

def start_scheduler():
    scheduler.start()
