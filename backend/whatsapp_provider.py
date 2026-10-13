import os
import requests

def send_whatsapp_message(to_phone: str, message: str, user_id: str = "default_user", human: bool = False):
    # We now talk to our local Baileys Node server instead of Meta!
    # human=True: typing indicator + human pause (auto sends only — manual
    # approves are already human-paced by the tap itself).
    url = "http://127.0.0.1:3001/api/send"

    # Preserve full JIDs (user@lid / user@s.whatsapp.net) — stripping the
    # domain breaks LID delivery. Only digit-clean bare phone numbers.
    to_phone = (to_phone or "").strip()
    if "@" in to_phone:
        dest = to_phone
    else:
        dest = "".join(filter(str.isdigit, to_phone))

    payload = {
        "to": dest,
        "text": message,
        "user_id": user_id,
        "human": human,
    }

    print(f"Sending WhatsApp message to {dest} via Baileys API...")
    try:
        response = requests.post(url, json=payload, timeout=120)
        print(f"Baileys API Response: {response.status_code} - {response.text}")
        return response.json()
    except Exception as e:
        print(f"Error connecting to Baileys service (Is it running on port 3001?): {e}")
        return None
