from backend.database import SessionLocal
from backend.agent import process_message

db = SessionLocal()
try:
    print("Testing prospect agent response...")
    reply = process_message("Yeah tomorrow at 2 PM works for me", "1234567890", db)
    print(f"AI Reply: {reply}")
except Exception as e:
    print(f"ERROR: {e}")
finally:
    db.close()
