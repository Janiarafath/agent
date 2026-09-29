# GrowthPilot - Autonomy & Control

## 1. The Autonomous Loop
GrowthPilot operates without manual triggers via a scheduled task runner (Celery Beat).

- **Hourly Jobs:** Check email inboxes (IMAP/API), process WhatsApp webhooks, transition `REPLIED` states, trigger Reply Agents, check scheduled follow-ups.
- **Daily Jobs:** Trigger Discovery Agent based on ICP, run Batch Research and Qualification, fill the `OUTREACH_READY` queue.

## 2. The Kill Switch
A critical safety feature accessible via the Command Center or a master API endpoint.
- **Action:** Changes system state to `PAUSED`.
- **Effect:** Instantly halts the Celery worker queues for outbound actions. No emails, no WhatsApp messages, no follow-ups will leave the system until manually resumed.

## 3. Automation Levels
Users can configure how much trust to grant GrowthPilot:

- **LEVEL 0 (Draft Only):** AI does research and writes drafts. Nothing is sent without human clicks "Approve".
- **LEVEL 1 (Low-Risk FAQ):** AI can auto-reply to basic questions (e.g., "Where are you located?") but drafts outbounds.
- **LEVEL 2 (Routine Sales):** AI sends initial outreach and follow-ups autonomously, but escalates pricing requests and proposals to humans.
- **LEVEL 3 (Full Autonomy):** AI handles the full loop, up to generating and sending standardized proposals. Escalates only on `UNKNOWN` intent or angry replies.

## 4. Recoverable Failures
The Supervisor Agent handles exceptions:
- **Rate Limit Hit (429):** Sleep and retry (Exponential Backoff).
- **Missing Data:** If Research fails, mark prospect as `LOW_CONFIDENCE` and escalate.
- **Network Timeout:** State machine idempotency ensures a message is never sent twice if the database transaction didn't complete.
