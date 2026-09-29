import os
import requests

def send_whatsapp_message(to_phone: str, message: str):
    token = os.getenv("WHATSAPP_API_TOKEN")
    phone_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID")
    
    if not token or not phone_id:
        print("Missing WhatsApp credentials. Please add them to Render Environment Variables.")
        return None
        
    url = f"https://graph.facebook.com/v18.0/{phone_id}/messages"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "messaging_product": "whatsapp",
        "to": to_phone,
        "type": "text",
        "text": {"body": message}
    }
    
    print(f"Sending WhatsApp message to {to_phone}...")
    response = requests.post(url, headers=headers, json=payload)
    print(f"Meta API Response: {response.status_code} - {response.text}")
    
    return response.json()
