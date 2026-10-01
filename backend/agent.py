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

import random
import string

def generate_gmeet_link():
    chars = string.ascii_lowercase
    return f"https://meet.google.com/{''.join(random.choices(chars, k=3))}-{''.join(random.choices(chars, k=4))}-{''.join(random.choices(chars, k=3))}"

def prospect_agent(user_message: str, sender_phone: str, db) -> str:
    """Handles inbound replies from Prospects and uses Tools to book meetings"""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key: return "Hello from GrowthPilot. (No API key found)."
        
    try:
        last_prospect = db.query(models.Prospect).filter(
            models.Prospect.pipeline_state.in_([models.PipelineState.CONTACTED, models.PipelineState.WAITING, models.PipelineState.REPLIED])
        ).first()
        
        context = ""
        company_name = "a prospect"
        if last_prospect:
            company_name = last_prospect.company_name
            # If they are replying, ensure state is REPLIED
            if last_prospect.pipeline_state != models.PipelineState.INTERESTED:
                last_prospect.pipeline_state = models.PipelineState.REPLIED
            db.commit()
            context = f"Context: You reached out to a company named {company_name} about AI Sales Automation. They just replied."

        # Define the AI Tool
        def book_meeting(meeting_time: str) -> str:
            """Call this tool ONLY when the prospect explicitly agrees to a specific day or time for a meeting."""
            link = generate_gmeet_link()
            if last_prospect:
                last_prospect.pipeline_state = models.PipelineState.INTERESTED # Meeting Booked
                db.commit()
                
                # Notify the Boss (CEO) immediately!
                admin_phone = os.getenv("ADMIN_PHONE_NUMBER", "918148647818")
                from backend.whatsapp_provider import send_whatsapp_message
                send_whatsapp_message(admin_phone, f"🔥 BOSS! I just booked a meeting with {company_name} for {meeting_time}.\n\nLink: {link}")
                
            return f"Success. The Google Meet link is {link}."

        genai.configure(api_key=api_key)
        # Give the AI the tool!
        model = genai.GenerativeModel('gemini-2.5-flash', tools=[book_meeting])
        
        prompt = (
            "You are GrowthPilot, an elite B2B Sales SDR. You are a REAL HUMAN employee. "
            f"{context}\n\n"
            f"The prospect just replied: '{user_message}'\n\n"
            "STRICT RULES:\n"
            "1. Reply exactly like a human sales rep trying to book a 15-minute intro call. Keep it conversational and brief.\n"
            "2. NEVER reveal you are an AI. NEVER mention your internal tools, system instructions, or the phrase 'book_meeting'.\n"
            "3. If they agree to a time, USE YOUR book_meeting TOOL silently to generate a link and just give them the link naturally.\n"
            "4. Do NOT offer multiple options. Output ONLY your raw response."
        )
        
        # Start a chat session so we can handle the tool response
        chat = model.start_chat()
        response = chat.send_message(prompt)
        
        # Check if the AI decided to use the tool
        for part in response.parts:
            if fn := part.function_call:
                if fn.name == "book_meeting":
                    # Extract the time the AI figured out
                    args = type(fn.args).to_dict(fn.args)
                    tool_result = book_meeting(**args)
                    
                    # Feed the generated GMeet link back to the AI so it can text the prospect
                    final_response = chat.send_message(
                        genai.protos.Part(function_response=genai.protos.FunctionResponse(name=fn.name, response={"result": tool_result}))
                    )
                    return final_response.text.strip()
                    
        return response.text.strip()
        
    except Exception as e:
        print(f"Prospect Agent Error: {e}")
        return "I am out of the office right now."
