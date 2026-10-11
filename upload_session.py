"""Upload a home-linked WhatsApp session to the cloud engine.

Why: WhatsApp currently rejects fresh logins from cloud IPs (pairing codes say
"Couldn't link device", QR stalls) but resumes home-linked sessions fine.
So: link on THIS pc (residential IP), then move the session to the server.

Usage:
  python upload_session.py <firebase_uid> [server_url]

  firebase_uid : the SAME uid you sign into the dashboard with
  server_url   : backend base, default https://dashwin-eabbvvdpda-el.a.run.app

Steps before running:
  1. Backend + wa-service running locally (they already are).
  2. Frontend: cd frontend && npm run dev -> open http://localhost:3000
  3. Sign in (same Google account as production), dashboard -> Link WhatsApp
     -> Scan QR with YOUR phone (home wifi, residential IP). Wait for "Linked".
  4. Run this script. Then open the LIVE dashboard -> it shows Linked. Done.
  5. Re-run after every backend redeploy (container storage is wiped).
"""
import base64
import json
import os
import sys
import urllib.request

LOCAL_AUTH = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                           "wa-service", "auth_info_baileys")

def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    uid = sys.argv[1].strip()
    server = (sys.argv[2] if len(sys.argv) > 2
              else "https://dashwin-eabbvvdpda-el.a.run.app").rstrip("/")
    src = os.path.join(LOCAL_AUTH, uid)
    if not os.path.isdir(src):
        print(f"No local session for '{uid}' in {src}")
        print("Link first via http://localhost:3000 (QR tab), then re-run.")
        return 1
    files = {}
    for name in sorted(os.listdir(src)):
        p = os.path.join(src, name)
        if os.path.isfile(p) and len(name) < 64 and not name.startswith("."):
            with open(p, "rb") as f:
                files[name] = base64.b64encode(f.read()).decode()
    if "creds.json" not in files:
        print("Session incomplete (no creds.json) — link fully first, then re-run.")
        return 1
    print(f"Uploading {len(files)} session files for {uid} -> {server} ...")
    body = json.dumps({"userId": uid, "files": files}).encode()
    code, text = post(server, body)
    if code == 400 and "too many files" in text and len(files) > 1:
        # Old server cap: creds.json alone still resumes the login.
        print("Server file cap hit — retrying with essential login file only ...")
        body = json.dumps({"userId": uid, "files": {"creds.json": files["creds.json"]}}).encode()
        code, text = post(server, body)
    print("Server:", code, text[:200])
    if code != 200:
        print("Upload FAILED.")
        print("Is the new backend deployed (restore route live)? Redeploy, then re-run.")
        return 1
    print("Done. Open the live dashboard — WhatsApp should show Linked within ~30s.")
    return 0


def post(server, body):
    req = urllib.request.Request(server + "/api/whatsapp/restore", data=body,
                                 headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.status, r.read().decode()
    except Exception as e:
        return 0, str(e)[:300]

if __name__ == "__main__":
    raise SystemExit(main())
