import os
import requests

def send_whatsapp_message(to_phone: str, message: str, user_id: str = "default_user"):
    # We now talk to our local Baileys Node server instead of Meta!
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
        "user_id": user_id
    }

    print(f"Sending WhatsApp message to {dest} via Baileys API...")
    try:
        response = requests.post(url, json=payload)
        print(f"Baileys API Response: {response.status_code} - {response.text}")
        return response.json()
    except Exception as e:
        print(f"Error connecting to Baileys service (Is it running on port 3001?): {e}")
        return None
