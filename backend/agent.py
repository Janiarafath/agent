import os
from litellm import completion

def generate_reply(user_message: str) -> str:
    """
    The brain of the Reply Agent. 
    It classifies the intent and drafts a response.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    
    if not api_key:
        return "GrowthPilot is online! (Note: GEMINI_API_KEY is missing in Render). You said: " + user_message
        
    messages = [
        {"role": "system", "content": "You are GrowthPilot, an autonomous AI Sales Agent. You are currently in Demo Mode. Be extremely polite, professional, and keep your answers under 2 sentences. Acknowledge the user's message and tell them you are ready to help them grow their business."},
        {"role": "user", "content": user_message}
    ]
    
    try:
        # Use Gemini via LiteLLM
        response = completion(model="gemini/gemini-1.5-flash", messages=messages)
        return response.choices[0].message.content
    except Exception as e:
        error_msg = str(e)
        print(f"AI Generation Error: {error_msg}")
        return f"I am currently experiencing a cognitive error. Here is the exact issue: {error_msg}"
