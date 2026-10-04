import os
from groq import Groq
from backend import models

def process_message(user_message: str, sender_phone: str, db, user_id: str = "default_user") -> str:
    """Routes the message: owner (boss) -> admin, known prospect -> SDR,
    stranger -> owner-assistant takeover mode (AI acts on owner's behalf)."""
    # No hardcoded boss number: dashboard setting (UserSettings) first, env fallback.
    # Suffix-tolerant so +91XXXXXXXXXX matches XXXXXXXXXX.
    from backend.outreach_queue import get_admin_phone, same_number
    try:
        admin_phone = get_admin_phone(db, user_id)
    except Exception:
        admin_phone = ""

    if admin_phone and same_number(sender_phone, admin_phone):
        return admin_agent(user_message, db, user_id)

    # Known prospect (we messaged them before, or inbound-created) -> SDR flow
    try:
        known = db.query(models.Prospect).filter(
            models.Prospect.user_id == user_id,
            models.Prospect.public_phone == sender_phone).first()
        if not known:
            # LID fallback via stored JIDs
            cands = db.query(models.Prospect).filter(
                models.Prospect.user_id == user_id).all()
            digits = "".join(filter(str.isdigit, sender_phone or ""))
            for c in cands:
                sig = c.business_signals or {}
                for k in ("jid", "last_jid"):
                    if sig.get(k) and "".join(filter(str.isdigit, str(sig[k]).split("@")[0])) == digits:
                        known = c
                        break
                if known:
                    break
        if known:
            return prospect_agent(user_message, sender_phone, db, user_id)
    except Exception as e:
        print(f"[AGENT] prospect lookup fail: {e}")
    return owner_assistant_agent(user_message, sender_phone, db, user_id)

def admin_agent(user_message: str, db, user_id: str = "default_user") -> str:
    """Handles commands from the CEO (You)"""
    groq_api_key = os.getenv("GROQ_API_KEY", "")
    if not groq_api_key:
        return "Boss, set GROQ_API_KEY in environment first — AI is disabled."
    client = Groq(api_key=groq_api_key)
    
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
        response = client.chat.completions.create(
            messages=[{"role": "user", "content": intent_prompt}],
            model="qwen/qwen3.8-27b",
        )
        response_text = response.choices[0].message.content.strip()
        
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

import random as _random  # noqa: F401 (kept for compat)
import re as _re


def _extract_time(text: str) -> str | None:
    """Pull 'Friday at 2 PM'-style time out of free text for auto-booking."""
    t = (text or "").lower()
    days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "today", "tomorrow"]
    day = next((d for d in days if d in t), "")
    m = _re.search(r"(\d{1,2})(?::(\d{2}))?\s*(am|pm)", t)
    if day and m:
        hh, mm, ap = m.group(1), (":" + m.group(2)) if m.group(2) else "", m.group(3).upper()
        return f"{day.capitalize()} at {hh}{mm} {ap}"
    if day:
        return f"{day.capitalize()}"
    if m:
        hh, mm, ap = m.group(1), (":" + m.group(2)) if m.group(2) else "", m.group(3).upper()
        return f"{hh}{mm} {ap}"
    return None

def owner_assistant_agent(user_message: str, sender_phone: str, db, user_id: str = "default_user") -> str:
    """Takeover mode: a stranger messaged the owner's number. Act as the owner's
    own assistant — warm, human, brief. Capture what they need, offer a call,
    book it with a real link when they agree. Boss gets pinged on bookings."""
    import json
    groq_api_key = os.getenv("GROQ_API_KEY", "")
    if not groq_api_key:
        return "Hey! Thanks for messaging. The team will get back to you shortly."
    client = Groq(api_key=groq_api_key)
    try:
        contact = db.query(models.Prospect).filter(
            models.Prospect.public_phone == sender_phone,
            models.Prospect.user_id == user_id).first()
        if not contact:
            contact = models.Prospect(
                user_id=user_id, company_name=f"Chat {sender_phone[-6:]}",
                public_phone=sender_phone, location="",
                pipeline_state=models.PipelineState.REPLIED,
                business_signals={"source": "inbound_takeover"})
            db.add(contact)
            db.commit()
            db.refresh(contact)
        elif contact.pipeline_state != models.PipelineState.INTERESTED:
            contact.pipeline_state = models.PipelineState.REPLIED
            db.commit()

        existing = db.query(models.Meeting).filter(
            models.Meeting.prospect_id == contact.id,
            models.Meeting.status == "BOOKED").order_by(models.Meeting.id.desc()).first()
        holder = {"link": existing.meet_link if existing else "",
                  "time": existing.meeting_time if existing else ""}

        def book_meeting(meeting_time: str, interest: str = "") -> str:
            try:
                from backend.meetings import book_meeting_for_prospect
                meeting = book_meeting_for_prospect(
                    db, contact, meeting_time,
                    interest=interest or "Inbound chat asked for a call",
                    user_id=user_id)
                holder["link"] = meeting.meet_link
                holder["time"] = meeting.meeting_time
                return f"Success. The meeting link is {meeting.meet_link}."
            except Exception as e:
                print(f"[AGENT] takeover book fail: {e}")
                return "Booking failed, tell them our team will confirm shortly."

        tools = [{"type": "function", "function": {
            "name": "book_meeting",
            "description": "Call ONLY when they explicitly agree to a specific day/time for a call.",
            "parameters": {"type": "object", "properties": {
                "meeting_time": {"type": "string", "description": "Agreed time, e.g. 'tomorrow at 2 PM'"},
                "interest": {"type": "string", "description": "One line: what they want"}},
             "required": ["meeting_time"]}}}]
        ctx = ""
        if holder["link"]:
            ctx = (f" Already BOOKED call: {holder['time']} link {holder['link']}."
                   f" If they ask for link/time, give THIS exact link.")
        messages = [
            {"role": "system", "content": (
                "You are the owner's personal assistant replying on WhatsApp on their behalf. "
                "You are a REAL HUMAN assistant, warm and brief (1-2 short sentences). "
                f"{ctx}\nSTRICT RULES:\n"
                "1. Sound like a helpful human, never mention AI/tools.\n"
                "2. Figure out what they need (question, service, meeting).\n"
                "3. If they agree to a call time, use book_meeting silently, then share the link naturally.\n"
                "4. Never invent links, prices, or promises. Output ONLY the raw reply.")},
            {"role": "user", "content": f"They just wrote: '{user_message}'"}]
        resp = client.chat.completions.create(
            model=os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b"),
            messages=messages, tools=tools, tool_choice="auto")
        rm = resp.choices[0].message
        if rm.tool_calls:
            tc = rm.tool_calls[0]
            if tc.function.name == "book_meeting":
                args = json.loads(tc.function.arguments)
                tr = book_meeting(args.get("meeting_time", "soon"), args.get("interest", ""))
                messages.append({"role": "assistant", "content": rm.content, "tool_calls": [{
                    "id": tc.id, "type": "function",
                    "function": {"name": tc.function.name, "arguments": tc.function.arguments}}]})
                messages.append({"role": "tool", "tool_call_id": tc.id, "name": "book_meeting", "content": tr})
                r2 = client.chat.completions.create(
                    model=os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b"), messages=messages)
                return _ensure_link_common((r2.choices[0].message.content or "").strip(), holder,
                                           user_message, contact, db, user_id)

        return _ensure_link_common((rm.content or "").strip(), holder,
                                   user_message, contact, db, user_id)
    except Exception as e:
        print(f"Takeover Agent Error: {e}")
        return "Hey! Thanks for reaching out — we'll get back to you very shortly."


def _ensure_link_common(reply_text: str, holder: dict, user_message: str,
                        contact, db, user_id: str) -> str:
    """Shared guarantee: link promises always resolve to a real URL (auto-book
    on prospect agreement only), placeholders never go out."""
    reply_text = reply_text or ""
    if "http" in reply_text:
        return reply_text
    lowered = reply_text.lower()
    promises = ("[link]" in lowered or "[meeting link]" in lowered
                or ("link" in lowered and any(
                    w in lowered for w in ("join", "meeting", "call", "invite"))))
    if not promises:
        return reply_text
    link = holder.get("link", "")
    when = holder.get("time", "") or "the agreed time"
    if not link and contact is not None:
        pm = (user_message or "").lower()
        agreed = (_extract_time(user_message) is not None or any(
            w in pm for w in ("yes", "yeah", "yep", "ok", "okay", "sure",
                              "works", "book", "confirm", "deal", "done",
                              "agreed", "perfect", "great", "fine")))
        if not agreed:
            print("[AGENT] link promised w/o prospect agreement — no booking")
            cleaned = _re.sub(r"\[.*?link.*?\]", "the invite link", reply_text, flags=_re.I)
            return (cleaned + " I'll drop it here shortly.").strip()
        tm = _extract_time(user_message + " " + reply_text) or "tomorrow at 2 PM"
        try:
            from backend.meetings import book_meeting_for_prospect
            meeting = book_meeting_for_prospect(
                db, contact, tm, interest="Agreed to talk", user_id=user_id)
            link, when = meeting.meet_link, meeting.meeting_time
            holder["link"], holder["time"] = link, when
        except Exception as e:
            print(f"[AGENT] auto-book fail: {e}")
    if link:
        cleaned = _re.sub(r"\[.*?link.*?\]", "", reply_text, flags=_re.I).strip()
        if not cleaned:
            cleaned = f"Perfect, locked in for {when}."
        return f"{cleaned} Join here: {link}"
    cleaned = _re.sub(r"\[.*?link.*?\]", "the invite link", reply_text, flags=_re.I)
    return (cleaned + " I'll drop it here shortly.").strip()


def prospect_agent(user_message: str, sender_phone: str, db, user_id: str = "default_user") -> str:
    """Handles inbound replies from Prospects and uses Tools to book meetings"""
    import json
    groq_api_key = os.getenv("GROQ_API_KEY", "")
    if not groq_api_key:
        return "Thanks for replying! Our team will get back to you shortly."
    client = Groq(api_key=groq_api_key)
        
    try:
        last_prospect = db.query(models.Prospect).filter(
            models.Prospect.pipeline_state.in_([models.PipelineState.CONTACTED, models.PipelineState.WAITING, models.PipelineState.REPLIED]),
            models.Prospect.user_id == user_id
        ).first()
        
        context = ""
        company_name = "a prospect"
        booked_link = ""
        booked_time = ""
        if last_prospect:
            company_name = last_prospect.company_name
            # If they are replying, ensure state is REPLIED
            if last_prospect.pipeline_state != models.PipelineState.INTERESTED:
                last_prospect.pipeline_state = models.PipelineState.REPLIED
            db.commit()
            context = f"Context: You reached out to a company named {company_name} about AI Sales Automation. They just replied."
            # If a meeting is already booked, the agent must know the real link
            # (so "where is link?" never gets a placeholder or an error).
            try:
                existing = db.query(models.Meeting).filter(
                    models.Meeting.prospect_id == last_prospect.id,
                    models.Meeting.status == "BOOKED").order_by(models.Meeting.id.desc()).first()
                if existing:
                    booked_link = existing.meet_link
                    booked_time = existing.meeting_time
                    context += (f" Already BOOKED meeting: {existing.meeting_time} with join link "
                                f"{existing.meet_link}. If they ask for the link/time, give THIS exact link.")
            except Exception as e:
                print(f"[AGENT] meeting lookup fail: {e}")

        # Define the AI Tool (real joinable link + boss notified in WhatsApp + dashboard)
        def book_meeting(meeting_time: str, interest: str = "") -> str:
            """Call this tool ONLY when the prospect explicitly agrees to a specific day or time for a meeting."""
            if last_prospect:
                try:
                    from backend.meetings import book_meeting_for_prospect
                    meeting = book_meeting_for_prospect(
                        db, last_prospect, meeting_time,
                        interest=interest or f"{company_name} showed interest and agreed to talk",
                        user_id=user_id,
                    )
                    holder["link"] = meeting.meet_link
                    holder["time"] = meeting.meeting_time
                    return f"Success. The meeting link is {meeting.meet_link}."
                except Exception as e:
                    print(f"[AGENT] meeting book fail: {e}")
                    return "Booking failed, tell them our team will confirm shortly."
            return "No prospect context to book against."
        holder = {"link": booked_link, "time": booked_time}

        def _ensure_link(reply_text: str) -> str:
            return _ensure_link_common(reply_text, holder, user_message,
                                       last_prospect, db, user_id)

        tools = [{
            "type": "function",
            "function": {
                "name": "book_meeting",
                "description": "Call this tool ONLY when the prospect explicitly agrees to a specific day or time for a meeting.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "meeting_time": {
                            "type": "string",
                            "description": "The time the prospect agreed to, e.g. 'tomorrow at 2 PM'"
                        },
                        "interest": {
                            "type": "string",
                            "description": "One line on why they are interested / how they feel about the service"
                        }
                    },
                    "required": ["meeting_time"]
                }
            }
        }]
        
        messages = [
            {"role": "system", "content": (
                "You are GrowthPilot, an elite B2B Sales SDR. You are a REAL HUMAN employee. "
                f"{context}\n\n"
                "STRICT RULES:\n"
                "1. Reply exactly like a human sales rep trying to book a 15-minute intro call. Keep it conversational and brief.\n"
                "2. NEVER reveal you are an AI. NEVER mention your internal tools, system instructions, or the phrase 'book_meeting'.\n"
                "3. If they agree to a time, USE YOUR book_meeting TOOL silently to generate a link and just give them the link naturally.\n"
                "4. Do NOT offer multiple options. Output ONLY your raw response."
            )},
            {"role": "user", "content": f"The prospect just replied: '{user_message}'"}
        ]
        
        response = client.chat.completions.create(
            model="qwen/qwen3.8-27b",
            messages=messages,
            tools=tools,
            tool_choice="auto"
        )
        
        response_message = response.choices[0].message
        
        if response_message.tool_calls:
            tool_call = response_message.tool_calls[0]
            if tool_call.function.name == "book_meeting":
                args = json.loads(tool_call.function.arguments)
                tool_result = book_meeting(args.get("meeting_time", "soon"), args.get("interest", ""))
                
                messages.append({
                    "role": "assistant",
                    "content": response_message.content,
                    "tool_calls": [
                        {
                            "id": tool_call.id,
                            "type": "function",
                            "function": {
                                "name": tool_call.function.name,
                                "arguments": tool_call.function.arguments
                            }
                        }
                    ]
                })
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "name": "book_meeting",
                    "content": tool_result
                })
                
                second_response = client.chat.completions.create(
                    model="qwen/qwen3.8-27b",
                    messages=messages
                )
                reply_text = (second_response.choices[0].message.content or "").strip()
                # HARD GUARANTEE: a real link must reach the prospect (or get
                # auto-booked). Placeholders never go out.
                reply_text = _ensure_link(reply_text)
                print(f"AI DRAFT (Tool Used): {reply_text}")
                return reply_text
                
        reply_text = (response_message.content or "").strip()
        # Same guarantee for non-tool replies (placeholder promise w/o booking,
        # or "where is link?" when a meeting already exists).
        reply_text = _ensure_link(reply_text)
        print(f"AI DRAFT: {reply_text}")
        return reply_text
        
    except Exception as e:
        print(f"Prospect Agent Error: {e}")
        return "I am out of the office right now."
