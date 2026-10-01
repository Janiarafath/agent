import os
from apscheduler.schedulers.background import BackgroundScheduler
from backend.database import SessionLocal
from backend import models
from tavily import TavilyClient
import google.generativeai as genai

def run_autonomous_discovery():
    """The background job that finds leads and drafts outreach autonomously."""
    print("[AUTONOMOUS AGENT] Waking up to run daily discovery...")
    db = SessionLocal()
    
    try:
        tavily_key = os.getenv("TAVILY_API_KEY")
        if not tavily_key:
            print("[AUTONOMOUS AGENT] Missing Tavily API Key. Sleeping.")
            return

        tavily = TavilyClient(api_key=tavily_key)
        search_query = "companies looking for b2b saas solutions" # Default target
        
        print(f"[AUTONOMOUS AGENT] Searching Tavily for: {search_query}")
        search_response = tavily.search(query=search_query, search_depth="basic", max_results=3)
        results = search_response.get('results', [])
        
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-2.5-flash')
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
# Run every day at 9 AM (for demo purposes, we will also allow manual trigger)
scheduler.add_job(run_autonomous_discovery, 'cron', hour=9, minute=0)

def start_scheduler():
    scheduler.start()
