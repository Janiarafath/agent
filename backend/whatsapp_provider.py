import os
import requests

def send_whatsapp_message(to_phone: str, message: str):
    # We now talk to our local Baileys Node server instead of Meta!
    url = "http://127.0.0.1:3001/api/send"
    
    # Clean the phone number (remove +, spaces, etc)
    clean_phone = ''.join(filter(str.isdigit, to_phone))
    
    payload = {
        "to": clean_phone,
        "text": message
    }
    
    print(f"Sending WhatsApp message to {clean_phone} via Baileys API...")
    try:
        response = requests.post(url, json=payload)
        print(f"Baileys API Response: {response.status_code} - {response.text}")
        return response.json()
    except Exception as e:
        print(f"Error connecting to Baileys service (Is it running on port 3001?): {e}")
        return None
