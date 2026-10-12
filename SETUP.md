# DashWin — New Laptop Setup (30 minutes)

> Everything needed to run + deploy DashWin from a fresh machine.
> **Golden rule: `D:\agent\.env` (real secrets) is NEVER in git. Copy it via USB stick.**

Live right now: site https://dashwin.vercel.app · backend https://dashwin-eabbvvdpda-el.a.run.app · repo https://github.com/Janiarafath/agent (branch `main`).

## 0. What lives where

| Piece | Folder | Port (local) | Live |
|---|---|---|---|
| Landing + dashboard (Next.js 16) | `frontend/` | 3000 (`npm run dev`) | Vercel, auto-deploys on `git push` |
| Brain (FastAPI) + scheduler | `backend/` | 8000 | Cloud Run `dashwin`, asia-south1 (manual deploy) |
| WhatsApp engine (Baileys) | `wa-service/` (deps in `whatsapp_service/`) | 3001 | Same Cloud Run container (see `start.sh`) |
| Launch video project | `brag-output/dashwin/` | — | HyperFrames, render rarely |
| DB | Neon Postgres (cloud) | — | `DATABASE_URL` in `.env` |
| Auth | Firebase `agenticpilot-4fe71` | — | keys hardcoded in `frontend/src/lib/firebase.ts` |

## 1. Install (Windows)

1. Git, Node.js 24 (LTS), Python 3.12 (tick "Add to PATH").
2. Verify: `git --version`, `node --version` (>=22), `python --version`.
3. Optional (only for video work / free TTS): FFmpeg on PATH, `pip install kokoro-onnx soundfile imageio-ffmpeg`.
4. CLIs for deploys: `npm i -g vercel`, Google Cloud CLI (portable zip is fine) + `gcloud auth login`.

## 2. Clone + install deps

```powershell
git clone https://github.com/Janiarafath/agent.git
cd agent/frontend; npm install; cd ..
cd whatsapp_service; npm install --omit=dev --ignore-scripts; cd ..
pip install -r backend/requirements.txt
```

## 3. Secrets (copy via USB from old laptop — check each exists)

- **`D:\agent\.env`** — must define exactly:
  `DATABASE_URL, GROQ_API_KEY, GROQ_MODEL, TAVILY_API_KEY, MEET_PROVIDER, ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET`
- **`frontend/.env.local`** — recreate with:
  ```
  NEXT_PUBLIC_API_BASE=https://dashwin-eabbvvdpda-el.a.run.app
  NEXT_PUBLIC_WHATSAPP_API=http://127.0.0.1:3001
  ```
  (Hybrid dev: data from production, WhatsApp via home engine. Pure-local alternative: both `http://127.0.0.1:8000` / `:3001`.)
- Nothing else to copy: Vercel env (`NEXT_PUBLIC_API_BASE`) and Cloud Run env (the 8 keys above) already live in the clouds. Firebase needs no keys (hardcoded).

## 4. Run locally (3 terminals, this order)

```powershell
# 1. WhatsApp engine
cd D:\agent\wa-service; $env:WA_PORT=3001; node server.js
# 2. Backend
cd D:\agent; python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
# 3. Frontend
cd D:\agent\frontend; npm run dev
```
Verify: http://localhost:3000 (site) · http://127.0.0.1:8000/openapi.json (28+ routes) · http://127.0.0.1:3001/api/whatsapp/status?userId=x (engine).

## 5. Logins you'll need

- GitHub: `Janiarafath/agent` (repo is public; push needs your account).
- Google: GCP project from Cloud Shell (`gcloud projects list` to confirm) + Firebase console `agenticpilot-4fe71` + Neon dashboard (DB owner).
- Vercel: team `ajaniarafath-gmailcoms-projects`, project `growthpilot-dash`. **Settings → General → Root Directory must be `frontend`** or git pushes fail to build.

## 6. Deploying

- **Frontend:** just `git push origin main` → Vercel builds from `frontend/` in ~40s. If red, read the build log (classic cause: missing config — all configs are committed now).
- **Backend (Cloud Shell):**
  ```bash
  cd ~/dashwin && git pull
  gcloud run deploy dashwin --source . --region asia-south1 --memory 1Gi --cpu 1 --cpu-boost --timeout 3600 --allow-unauthenticated
  gcloud run services update dashwin --region asia-south1 --min-instances 1 --no-cpu-throttling
  ```
  Env vars persist across redeploys. Container storage wipes → WhatsApp session auto-resurrects from the DB vault (verify in Cloud Run → Logs: `resurrected session`). QR rescan only if vault is empty.

## 7. WhatsApp linking — what actually works (Oct 2026)

- **Pairing codes are refused by WhatsApp server-side** (all Baileys versions). Don't burn days on them; QR is the link.
- **Cloud IPs get fresh logins killed**: link via QR on localhost (residential IP), then move it:
  `python upload_session.py <firebase-uid>` (find UID: dashboard F12 console → `JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.startsWith('firebase:authUser:')))).uid`)
- Engine keeps itself alive (watchdog in `start.sh`), backs up sessions to DB vault, stops hammering after 3 logouts. Diagnose via `GET /api/whatsapp/status?userId=` → `diag` (socket, close codes, version, uptime) and `/api/whatsapp/linklog`.
- Engine talks WhatsApp version from `fetchLatestWaWebVersion` (never the stale Baileys default).
- Optional paid escape hatch: residential proxy → Cloud Run env `PROXY_URL=https://user:pass@host:port` (only if sessions get 401-killed; a slow proxy is worse than none).

## 8. Never-commit list (enforced by `.gitignore`, keep it that way)

`D:\agent\.env`, `wa-service/auth_info_baileys/`, `whatsapp_service/auth_info_webjs/`, `node_modules/`, `frontend/.next/`, `*.db`, `*.log`, video renders/snapshots.
