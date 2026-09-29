import os
import google.generativeai as genai

def generate_reply(user_message: str) -> str:
    """
    The brain of the Reply Agent. 
    It classifies the intent and drafts a response using the official Google SDK.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    
    if not api_key:
        return "GrowthPilot is online! (Note: GEMINI_API_KEY is missing in Render). You said: " + user_message
        
    try:
        genai.configure(api_key=api_key)
        
        prompt = (
            "You are GrowthPilot, an autonomous AI Sales Agent. You are currently in Demo Mode. "
            "Be extremely polite, professional, and keep your answers under 2 sentences. "
            "Acknowledge the user's message and tell them you are ready to help them grow their business.\n\n"
            f"User: {user_message}"
        )
        try:
            model = genai.GenerativeModel('gemini-1.5-flash')
            response = model.generate_content(prompt)
        except Exception as first_e:
            print(f"Failed with flash, trying gemini-pro. Error: {first_e}")
            model = genai.GenerativeModel('gemini-pro')
            response = model.generate_content(prompt)
            
        return response.text
        
    except Exception as e:
        error_msg = str(e)
        try:
            available_models = [m.name for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
            models_str = ", ".join(available_models)
        except Exception:
            models_str = "Could not fetch models"
            
        return f"Cognitive Error: {error_msg}. Your API key has access to these models: {models_str[:200]}"
