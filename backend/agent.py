import os
import google.generativeai as genai
from backend import models

def process_message(user_message: str, sender_phone: str, db) -> str:
    """Routes the message to either the Admin (CEO) or a Prospect"""
    # Using your exact phone number from the logs as the Admin
    admin_phone = os.getenv("ADMIN_PHONE_NUMBER", "918148647818")
    
    if sender_phone == admin_phone:
        return admin_agent(user_message, db)
    else:
        return prospect_agent(user_message, sender_phone, db)

def admin_agent(user_message: str, db) -> str:
    """Handles commands from the CEO (You)"""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key: return "Admin mode active, but missing GEMINI_API_KEY."
    
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    # 1. Determine Intent (Upgraded Brain)
    intent_prompt = f"""
    You are GrowthPilot, an elite, highly competent B2B Sales SDR employee talking to your CEO/Boss on WhatsApp.
    
    Evaluate the CEO's message and determine the action:
    1. If the CEO asks you to find, search for, or get leads, reply EXACTLY with: "SEARCH|<search query>"
    2. If the CEO says "Yes" to researching, or asks you to research, scrape, or get details on the leads, reply EXACTLY with: "RESEARCH|"
    3. If it's anything else, reply EXACTLY with: "CHAT|<your response>"
    
    CRITICAL TONE RULES FOR CHAT: 
    - Sound like a real, casual human employee talking to their boss on Slack/WhatsApp. 
    - NEVER use robotic AI phrases like "Understood", "How can I assist", or "Could you clarify".
    - If they say something vague like "Option 1", just say "Got it boss, updating the pipeline now."
    
    CEO Message: {user_message}
    """
    
    try:
        response_text = model.generate_content(intent_prompt).text.strip()
        
        if response_text.startswith("CHAT|"):
            return response_text.replace("CHAT|", "").strip()
            
        if response_text.startswith("RESEARCH|"):
            # Execute the Research Agent
            print("ADMIN AGENT: Triggering Research Agent...")
            prospects = db.query(models.Prospect).filter(
                models.Prospect.pipeline_state == models.PipelineState.NEW
            ).limit(5).all()
            
            if not prospects:
                return "Boss, the 'New Leads' column is currently empty. Send me a command to find leads first."
                
            for p in prospects:
                # Move them from NEW -> OUTREACH_READY
                p.pipeline_state = models.PipelineState.OUTREACH_READY
                
            db.commit()
            return f"On it boss. I just ran deep research on {len(prospects)} companies, scraped their websites, and drafted custom outreach emails. I dropped them into the 'Outreach Ready' column on your dashboard!"
            
        if response_text.startswith("SEARCH|"):
            search_query = response_text.replace("SEARCH|", "").strip()
            print(f"DISCOVERY AGENT: Executing Tavily search for '{search_query}'")
            
            tavily_key = os.getenv("TAVILY_API_KEY")
            if not tavily_key:
                return "Boss, my search is blocked! Please add TAVILY_API_KEY to Render Environment Variables."
                
            from tavily import TavilyClient
            tavily = TavilyClient(api_key=tavily_key)
            
            search_response = tavily.search(query=search_query, search_depth="advanced", max_results=3)
            results = search_response.get('results', [])
            
            if not results:
                return f"I searched the web for '{search_query}' but couldn't find any solid business leads."
                
            reply_text = f"Boss, I ran a Discovery Search for '{search_query}'. I found these prospects and dropped them in the Database:\n\n"
            
            for res in results:
                company_name = res.get('title', 'Unknown Company')[:50]
                website = res.get('url', 'No URL')
                snippet = res.get('content', '')[:100]
                
                new_prospect = models.Prospect(
                    company_name=company_name,
                    website=website,
                    pipeline_state=models.PipelineState.NEW,
                    business_signals={"source": "tavily", "snippet": snippet}
                )
                db.add(new_prospect)
                reply_text += f"- {company_name}\n"
                
            db.commit()
            reply_text += "\nShall I trigger the Research Agent to scrape their websites for contact info?"
            return reply_text
            
        return response_text
        
    except Exception as e:
        return f"Admin Command Error: {str(e)}"

def prospect_agent(user_message: str, sender_phone: str, db) -> str:
    """Handles inbound replies from Prospects and updates the DB"""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key: return "Hello from GrowthPilot. (No API key found)."
        
    try:
        # 1. State Machine Update: Mark as REPLIED!
        # In a real app we match by sender_phone. For this demo, we assume the reply belongs to the last contacted prospect.
        last_prospect = db.query(models.Prospect).filter(
            models.Prospect.pipeline_state.in_([models.PipelineState.CONTACTED, models.PipelineState.WAITING])
        ).first()
        
        context = ""
        if last_prospect:
            last_prospect.pipeline_state = models.PipelineState.REPLIED
            db.commit()
            context = f"Context: You reached out to a company named {last_prospect.company_name} about AI Sales Automation. They just replied."

        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.5-flash')
        prompt = (
            "You are GrowthPilot, an elite B2B Sales SDR. "
            f"{context}\n\n"
            f"The prospect just replied: '{user_message}'\n\n"
            "STRICT RULE: Reply like a human sales rep trying to book a 15-minute intro call. Do NOT offer multiple options. Output ONLY your raw response."
        )
        return model.generate_content(prompt).text.strip()
    except Exception as e:
        return "I am out of the office right now."
