# GrowthPilot - Open Source Audit

Before utilizing third-party libraries, we must ensure commercial compatibility and long-term viability. We actively avoid restrictive licenses like AGPL or GPLv3 that could force the proprietary codebase to be open-sourced.

## Approved Foundations

| Component | Repository / Project | License | Decision / Notes |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | Next.js (Vercel) | MIT | Industry standard. Safe for commercial use. |
| **UI Components** | Tailwind CSS / shadcn/ui | MIT | Flexible, non-restrictive. |
| **Backend Framework** | FastAPI | MIT | High performance, built-in Pydantic validation (critical for tool schemas). |
| **Agent Framework** | LangGraph (Langchain) | MIT | Ideal for strict, cyclic, state-machine driven agent orchestration. Far more controllable than CrewAI. |
| **Database** | PostgreSQL | PostgreSQL | Highly permissive, similar to BSD/MIT. |
| **Task Queue** | Celery | BSD-3-Clause | Robust distributed task queue. Safe for commercial use. |
| **Message Broker** | Redis | Redis Source Available License (RSALv2) | Safe for internal SaaS use cases (not competing with Redis itself). |
| **LLM Interface** | LiteLLM | MIT | Standardizes API calls across BYOK (Bring Your Own Key) providers (OpenAI, Anthropic, Gemini, Local). |

## Rejected / Cautionary Foundations
- **Flowise / Langflow:** (MIT) Good for prototyping, but visual builders lack the strict version control and deterministic error handling needed for a production state machine.
- **AutoGPT / BabyAGI:** Outdated agent loop architectures. Too prone to infinite loops and hallucinations. Not suitable for strict enterprise environments.
