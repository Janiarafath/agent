import os
import google.generativeai as genai
from duckduckgo_search import DDGS
from backend import models

def process_message(user_message: str, sender_phone: str, db) -> str:
    """Routes the message to either the Admin (CEO) or a Prospect"""
    # Using your exact phone number from the logs as the Admin
    admin_phone = os.getenv("ADMIN_PHONE_NUMBER", "918148647818")
    
    if sender_phone == admin_phone:
        return admin_agent(user_message, db)
    else:
        return prospect_agent(user_message)

def admin_agent(user_message: str, db) -> str:
    """Handles commands from the CEO (You)"""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key: return "Admin mode active, but missing GEMINI_API_KEY."
    
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    # 1. Determine Intent
    intent_prompt = f"""
    You are an AI assistant helping the CEO of GrowthPilot.
    If the CEO is asking you to find, search for, or get leads/prospects/customers, 
    extract ONLY the search query that would work well on Google to find those B2B businesses.
    If they are just chatting or asking something else, reply with exactly: "CHAT|" followed by your normal helpful conversational response.
    
    CEO Message: {user_message}
    """
    
    try:
        response_text = model.generate_content(intent_prompt).text.strip()
        
        if response_text.startswith("CHAT|"):
            return response_text.replace("CHAT|", "").strip()
            
        # 2. DISCOVERY AGENT: Execute Web Search!
        search_query = response_text
        print(f"DISCOVERY AGENT: Executing web search for '{search_query}'")
        
        results = DDGS().text(search_query, max_results=3)
        if not results:
            return f"I searched the web for '{search_query}' but couldn't find any solid business leads."
            
        reply_text = f"Boss, I ran a Discovery Search for '{search_query}'. I found these prospects and added them to your Postgres Database (State: NEW):\n\n"
        
        for res in results:
            company_name = res.get('title', 'Unknown Company')[:50]
            website = res.get('href', 'No URL')
            snippet = res.get('body', '')[:100]
            
            # Save to Database!
            new_prospect = models.Prospect(
                company_name=company_name,
                website=website,
                pipeline_state=models.PipelineState.NEW,
                business_signals={"source": "duckduckgo", "snippet": snippet}
            )
            db.add(new_prospect)
            reply_text += f"- {company_name}\n"
            
        db.commit()
        reply_text += "\nShall I trigger the Research Agent to scrape their websites for contact info?"
        return reply_text
        
    except Exception as e:
        return f"Admin Command Error: {str(e)}"

def prospect_agent(user_message: str) -> str:
    """Handles inbound replies from Prospects (The old logic)"""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key: return "Hello from GrowthPilot. (No API key found)."
        
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.5-flash')
        prompt = (
            "You are GrowthPilot, an autonomous AI Sales Agent. Be extremely polite, professional, "
            "and keep your answers under 2 sentences. Acknowledge the prospect's message.\n\n"
            f"Prospect: {user_message}"
        )
        return model.generate_content(prompt).text
    except Exception as e:
        return "I am out of the office right now."
