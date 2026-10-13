# DashWin — Scaling Statement (honest numbers, Oct 2026)

## What the product handles TODAY (no changes)

- **Users:** 1–50 businesses on one Cloud Run instance (1 CPU / 2Gi, min-instances 1).
- **Sending:** 25 messages/day per WhatsApp number — this is WhatsApp's safety rule, not our bottleneck. More volume = more sender numbers, never faster blasting.
- **Sessions:** each linked sender holds one lightweight socket (~MBs); dozens fit in 2Gi comfortably.
- **Database:** Neon + pooled connections (5 + overflow); dashboard polls are small indexed reads.
- **AI/search APIs:** Groq + Tavily free tiers — fine for tens of users; watch their dashboards, upgrade keys when rate-limited, no code change needed.

## What breaks first as users grow (in order)

1. **API keys' rate limits** (Groq/Tavily) — pay for bigger tiers. No code change.
2. **Single worker throughput** — long discovery runs share one box with API traffic. Fix: split the scheduler into its own Cloud Run service (same repo, `backend.scheduler` only), keep API lean.
3. **In-memory WA sessions** — one box holds all sockets; a second box can't share them. Fix: sticky sessions (route each user to one WA box) or Redis-backed session store.
4. **Abuse surface** — APIs currently trust `user_id`. Before onboarding strangers: verify Firebase ID tokens server-side (`firebase-admin`, ~half a day).
5. **Database connections** — past ~100 active users: Neon scale tier + PgBouncer, or read replica for dashboards.

## What we already built for scale

Watchdog, vault-backed sessions, fail-fast timeouts, capped memory, pinned deps, no overlapping crons, serialized pairing, plan metering (`backend/plans.py`), per-day send caps.

## Rule of thumb

Every 10x users: re-check in this order — API key quotas → split worker → session placement → auth → DB tier. Nothing here needs rewriting, only graduating.
