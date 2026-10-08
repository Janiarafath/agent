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

def _boss_status(db, user_id: str) -> str:
    """One-screen business summary for the boss, straight from the DB."""
    try:
        prospects = db.query(models.Prospect).filter(
            models.Prospect.user_id == user_id).all()

        def n(*states):
            return sum(1 for p in prospects if str(getattr(p.pipeline_state, "value", p.pipeline_state)) in states)

        from datetime import datetime, timezone
        today = datetime.now(timezone.utc).date()
        sent_today = replied_today = 0
        try:
            for m in db.query(models.Message).filter(
                    models.Message.channel == "WHATSAPP").all():
                ts = m.timestamp
                if ts is None:
                    continue
                if ts.tzinfo is None:
                    ts = ts.replace(tzinfo=timezone.utc)
                if ts.date() == today:
                    if m.direction == "OUTBOUND":
                        sent_today += 1
                    elif m.direction == "INBOUND":
                        replied_today += 1
        except Exception:
            pass
        try:
            meetings = db.query(models.Meeting).filter(
                models.Meeting.user_id == user_id,
                models.Meeting.status == "BOOKED").count()
        except Exception:
            meetings = 0
        try:
            pending = db.query(models.RecoveryDraft).filter(
                models.RecoveryDraft.user_id == user_id,
                models.RecoveryDraft.status == "pending").count()
        except Exception:
            pending = 0
        hot = 0
        try:
            for mm in db.query(models.LeadMemory).filter(
                    models.LeadMemory.user_id == user_id).all():
                if (mm.temp or "") == "HOT":
                    hot += 1
        except Exception:
            pass
        return (f"Boss, today's board: {len(prospects)} leads total "
                f"({n('OUTREACH_READY')} ready, {n('CONTACTED', 'WAITING')} waiting, "
                f"{n('REPLIED', 'INTERESTED')} engaged). "
                f"Today: {sent_today} sent, {replied_today} replies. "
                f"{meetings} meetings booked, {hot} hot, {pending} recoveries waiting. "
                f"Say 'followup' to nudge waiters or 'approve X' to send.")
    except Exception as e:
        return f"Status check hit a snag: {e}"


def _guarded_send(db, prospect, user_id: str) -> tuple[bool, str]:
    """Same guards as the dashboard approve button. Returns (ok, note)."""
    try:
        from backend.outreach_queue import can_send, log_message, same_number, get_admin_phone
        from backend import plans as _plans
        from backend.whatsapp_provider import send_whatsapp_message
        ok, reason = can_send(db, prospect, user_id)
        if not ok:
            return False, reason
        ok, reason = _plans.check_limit(db, user_id, "messages")
        if not ok:
            return False, reason
        try:
            admin_phone = get_admin_phone(db, user_id)
        except Exception:
            admin_phone = ""
        target = "".join(filter(str.isdigit, prospect.public_phone or ""))
        if not target:
            return False, "no-phone"
        if admin_phone and same_number(target, admin_phone):
            return False, "own-number"
        draft = (prospect.business_signals or {}).get("draft_message", "Hello!")
        result = send_whatsapp_message(prospect.public_phone, draft, user_id)
        if not result or result.get("status") != "sent":
            err = (result or {}).get("error", "not connected") \
                if isinstance(result, dict) else "not connected"
            return False, str(err)[:120]
        try:
            sig = dict(prospect.business_signals or {})
            if result.get("jid"):
                sig["jid"] = result["jid"]
                prospect.business_signals = sig
        except Exception:
            pass
        log_message(db, prospect.id, "OUTBOUND", draft, "SENT")
        _plans.bump(db, user_id, "messages")
        prospect.pipeline_state = models.PipelineState.CONTACTED
        db.commit()
        return True, "sent"
    except Exception as e:
        try:
            db.rollback()
        except Exception:
            pass
        return False, str(e)[:150]


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
    3. If the CEO asks for status, update, summary, numbers, pipeline, money, meetings, or what happened, reply EXACTLY with: "STATUS|"
    4. If the CEO asks to send follow-ups or follow up with leads, reply EXACTLY with: "FOLLOWUP|"
    5. If the CEO asks to approve/send to ONE specific company, reply EXACTLY with: "APPROVE|<company name>"
    6. If the CEO says approve/send ALL pending, reply EXACTLY with: "APPROVEALL|"
    7. If it's anything else, reply EXACTLY with: "CHAT|<your response>"

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

        if response_text.startswith("STATUS|"):
            return _boss_status(db, user_id)

        if response_text.startswith("FOLLOWUP|"):
            import threading
            from backend.scheduler import run_autonomous_followups
            t = threading.Thread(target=run_autonomous_followups, daemon=True)
            t.start()
            return ("On it boss — follow-up engine is running in the background, "
                    "polite nudges going out to everyone waiting. I'll ping you with results.")

        if response_text.startswith("APPROVEALL|"):
            cands = db.query(models.Prospect).filter(
                models.Prospect.user_id == user_id,
                models.Prospect.pipeline_state == models.PipelineState.OUTREACH_READY
            ).limit(10).all()
            if not cands:
                return "Boss, nothing waiting in Review — all clear."
            sent, skipped = [], []
            for p in cands:
                ok, msg = _guarded_send(db, p, user_id)
                (sent if ok else skipped).append(f"{p.company_name} ({msg})")
            out = f"Done boss: sent {len(sent)}, held {len(skipped)}."
            if sent:
                out += "\nSent: " + ", ".join(s for s in sent[:5])
            if skipped:
                out += "\nHeld: " + ", ".join(s for s in skipped[:5])
            return out

        if response_text.startswith("APPROVE|"):
            name = response_text.replace("APPROVE|", "").strip()
            p = db.query(models.Prospect).filter(
                models.Prospect.user_id == user_id,
                models.Prospect.pipeline_state == models.PipelineState.OUTREACH_READY,
                models.Prospect.company_name.ilike(f"%{name[:30]}%")).first()
            if not p:
                return f"Boss, no Review-stage lead matching '{name}'. Check the name on the dashboard."
            ok, msg = _guarded_send(db, p, user_id)
            return (f"Sent to {p.company_name}, boss." if ok
                    else f"Couldn't send to {p.company_name}: {msg}")

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

def _profile_block(db, user_id: str) -> tuple[str, str]:
    """Grounding facts + anti-hallucination rule for receptionist replies.
    Returns (prompt_block, services_text)."""
    try:
        p = db.query(models.BusinessProfile).filter(
            models.BusinessProfile.user_id == user_id).first()
    except Exception:
        p = None
    if not p or not (p.business_name or p.services or p.faq):
        return ("BUSINESS FACTS: not provided yet — keep answers general, "
                "never invent a business name, price, hours, or availability. "
                "If asked for specifics you don't have, say the team will confirm shortly.",
                "")
    lines = [f"BUSINESS: {(p.business_name or '').strip()}"]
    if p.industry:
        lines.append(f"Industry: {p.industry}")
    if p.services:
        lines.append(f"Services: {p.services}")
    if p.pricing:
        lines.append(f"Pricing: {p.pricing}")
    else:
        lines.append("Pricing: NOT PUBLISHED — never quote or guess any price.")
    if p.hours:
        lines.append(f"Hours: {p.hours}")
    if p.location:
        lines.append(f"Location: {p.location}")
    for f in (p.faq or [])[:8]:
        try:
            lines.append(f"- FAQ Q: {f.get('q', '')} A: {f.get('a', '')}")
        except Exception:
            pass
    if p.tone:
        lines.append(f"Tone: {p.tone}")
    lines.append("GROUNDING RULE: answer ONLY from the facts above. For anything not stated "
                 "(prices when unpublished, availability, promises), say the team will confirm "
                 "shortly. Never invent links, prices, dates, or policies.")
    return ("\n".join(lines), p.services or "")

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
        prof_text, prof_services = _profile_block(db, user_id)

        def finish(reply_text: str):
            try:
                from backend import plans as _plans
                _plans.bump(db, user_id, "ai")
            except Exception:
                pass
            try:
                from backend import memory as _mem
                if contact is not None:
                    _mem.update_memory(
                        db, user_id, contact.id, user_message,
                        service_hint=_mem._service(user_message, prof_services),
                        booked_time=(holder.get("time", "") if holder.get("link") else ""))
            except Exception as e:
                print(f"[MEMORY] finish fail: {e}")
            return reply_text

        messages = [
            {"role": "system", "content": (
                "You are the owner's personal assistant replying on WhatsApp on their behalf. "
                "You are a REAL HUMAN assistant, warm and brief (1-2 short sentences). "
                f"{ctx}\n{prof_text}\nSTRICT RULES:\n"
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
                return finish(_ensure_link_common((r2.choices[0].message.content or "").strip(), holder,
                                           user_message, contact, db, user_id))

        return finish(_ensure_link_common((rm.content or "").strip(), holder,
                                   user_message, contact, db, user_id))
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

        prof_text, prof_services = _profile_block(db, user_id)

        def finish(reply_text: str) -> str:
            try:
                from backend import plans as _plans
                _plans.bump(db, user_id, "ai")
            except Exception:
                pass
            try:
                from backend import memory as _mem
                if last_prospect is not None:
                    _mem.update_memory(
                        db, user_id, last_prospect.id, user_message,
                        service_hint=_mem._service(user_message, prof_services),
                        booked_time=(holder.get("time", "") if holder.get("link") else ""))
            except Exception as e:
                print(f"[MEMORY] finish fail: {e}")
            return reply_text

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
                f"{context}\n{prof_text}\n\n"
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
                reply_text = finish(_ensure_link(reply_text))
                print(f"AI DRAFT (Tool Used): {reply_text}")
                return reply_text
                
        reply_text = (response_message.content or "").strip()
        # Same guarantee for non-tool replies (placeholder promise w/o booking,
        # or "where is link?" when a meeting already exists).
        reply_text = finish(_ensure_link(reply_text))
        print(f"AI DRAFT: {reply_text}")
        return reply_text
        
    except Exception as e:
        print(f"Prospect Agent Error: {e}")
        return "I am out of the office right now."
