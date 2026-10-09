# Deploy DashWin backend to GCP Cloud Run (Mumbai)

> Safe migration: OpenShift stays untouched until this is verified. Nothing is deleted.

## 0. You need (one time)
- A Google account + GCP project with **billing enabled** (card required — no way around it)
- `gcloud` CLI installed: https://cloud.google.com/sdk/docs/install

## 1. Login + project (terminal / Cloud Shell)
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud config set run/region asia-south1
```

## 2. One-command deploy (builds from this repo, Mumbai, 1 CPU / 1 GiB)
```bash
gcloud run deploy dashwin --source . --region asia-south1 \
  --memory 1Gi --cpu 1 --timeout 3600 --allow-unauthenticated
```
Copy the `Service URL` it prints (looks like `https://dashwin-xxx.a.run.app`).

## 3. Add secrets (Console → Cloud Run → dashwin → Edit → Variables & Secrets)
Set these 8 (values live in your local `D:\agent\.env`, never in git):
`DATABASE_URL, TAVILY_API_KEY, GROQ_API_KEY, GROQ_MODEL, MEET_PROVIDER, ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET`
Then **Redeploy** so the revision picks them up.

## 4. Paste the Service URL back here
I verify: `/` alive → `/api/dashboard` → WhatsApp QR → campaign → approve → Zoom. Only then do we flip Vercel to it.

## Notes (honest)
- Test mode runs min-instances 0: first request cold-starts (~30–60s), idle gaps can drop the WA socket (rescan). Production = min-instances 1 + CPU always allocated (billed).
- WA sessions live in container /tmp: every redeploy = rescan QR once. Persistent disk (Filestore/GCSFuse) comes later if needed.
- OpenShift pod stays as-is until GCP is proven. No demolition.
