import os
from litellm import completion

def generate_reply(user_message: str) -> str:
    """
    The brain of the Reply Agent. 
    It classifies the intent and drafts a response.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    
    if not api_key:
        return "GrowthPilot is online! (Note: OPENAI_API_KEY is missing in Render, so I am running in basic echo mode). You said: " + user_message
        
    messages = [
        {"role": "system", "content": "You are GrowthPilot, an autonomous AI Sales Agent. You are currently in Demo Mode. Be extremely polite, professional, and keep your answers under 2 sentences. Acknowledge the user's message and tell them you are ready to help them grow their business."},
        {"role": "user", "content": user_message}
    ]
    
    try:
        # We use gpt-4o-mini as it is fast and cheap for basic replies
        response = completion(model="gpt-4o-mini", messages=messages)
        return response.choices[0].message.content
    except Exception as e:
        print(f"AI Generation Error: {e}")
        return "I am currently experiencing a cognitive error. Please check the server logs."
