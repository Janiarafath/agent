"""WhatsApp existence check via local web.js service (getNumberId).
Low QPS, cached in Prospect.business_signals to avoid re-checks.
"""
import time
import requests

CHECK_URL = "http://127.0.0.1:3001/api/check"
_last_check_ts = 0.0


def is_whatsapp_registered(phone_digits: str, user_id: str = "default_user", min_interval: float = 2.5):
    """Return True/False/None (None = unknown/service down). Rate-limited client-side."""
    global _last_check_ts
    if not phone_digits:
        return None
    # client-side throttle: verify is the #1 ban trigger if hammered
    wait = min_interval - (time.time() - _last_check_ts)
    if wait > 0:
        time.sleep(wait)
    try:
        r = requests.get(CHECK_URL, params={"number": phone_digits, "userId": user_id}, timeout=15)
        _last_check_ts = time.time()
        if r.status_code != 200:
            return None
        j = r.json()
        return bool(j.get("exists"))
    except Exception as e:
        print(f"[VERIFY] check fail {phone_digits}: {e}")
        return None
