import os
from apscheduler.schedulers.background import BackgroundScheduler
from backend.database import SessionLocal
from backend import models
from tavily import TavilyClient
import google.generativeai as genai

def run_autonomous_discovery(search_query: str = "companies looking for b2b saas solutions"):
    """The background job that finds leads and drafts outreach autonomously."""
    print(f"[AUTONOMOUS AGENT] Waking up to run daily discovery for: {search_query}...")
    db = SessionLocal()
    
    try:
        tavily_key = os.getenv("TAVILY_API_KEY")
        if not tavily_key:
            print("[AUTONOMOUS AGENT] Missing Tavily API Key. Sleeping.")
            return

        tavily = TavilyClient(api_key=tavily_key)
        
        print(f"[AUTONOMOUS AGENT] Searching Tavily for: {search_query}")
        search_response = tavily.search(query=search_query, search_depth="basic", max_results=3)
        results = search_response.get('results', [])
        
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-3.8-flash')
        else:
            model = None
            
        leads_added = 0
        for res in results:
            company_name = res.get('title', 'Unknown Company')[:50]
            website = res.get('url', 'No URL')
            snippet = res.get('content', '')[:150]
            
            # Check if exists
            existing = db.query(models.Prospect).filter(models.Prospect.website == website).first()
            if existing:
                continue
                
            print(f"[AUTONOMOUS AGENT] Found new lead: {company_name}")
            
            # Draft personalized outreach
            draft = "Hi, saw your company and would love to connect."
            if model:
                try:
                    prompt = f"Draft a 2-sentence highly personalized cold WhatsApp message to a company named {company_name}. Here is what they do: {snippet}. Offer our AI Sales Automation service."
                    draft = model.generate_content(prompt).text.strip()
                except:
                    pass
            
            new_prospect = models.Prospect(
                company_name=company_name,
                website=website,
                pipeline_state=models.PipelineState.OUTREACH_READY,
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
        admin_phone = os.getenv("ADMIN_PHONE_NUMBER", "918148647818")
        from backend.whatsapp_provider import send_whatsapp_message
        
        import time
        import random
        
        for p in prospects:
            print(f"[FOLLOW-UP ENGINE] Drafting follow-up for {p.company_name}...")
            
            draft = f"Hi again! Just bubbling this up. Are you still looking for help at {p.company_name}?"
            if model:
                try:
                    prompt = f"Write exactly ONE SHORT SENTENCE to follow up with {p.company_name}. I previously emailed them about AI sales automation. STRICT RULE: Do NOT provide options. Do NOT output conversational filler like 'Here is your draft'. Just output the raw message text."
                    draft = model.generate_content(prompt).text.strip()
                except:
                    pass
            
            # Send the follow up (to the admin for demo purposes)
            send_whatsapp_message(admin_phone, f"[Follow-up to {p.company_name}] {draft}")
            
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
