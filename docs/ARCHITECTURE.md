# GrowthPilot - System Architecture

## 1. High-Level Stack
- **Frontend:** Next.js + TypeScript + Tailwind CSS (shadcn/ui)
- **Backend:** Python + FastAPI
- **Database:** PostgreSQL (via SQLAlchemy or SQLModel)
- **Task Queue:** Celery + Redis
- **Agent Orchestration:** LangGraph (for strict state-machine agent flows)
- **Deployment:** Docker / Docker Compose

## 2. Multi-Agent Architecture (LangGraph)
GrowthPilot is NOT a single LLM call. It is a graph of specialized workers managed by a **Supervisor Agent**.

1.  **Supervisor:** Routes tasks, handles recoverable errors, checks budgets, enforces kill switch.
2.  **Discovery Agent:** Interfaces with Search/Directory tools. Normalizes raw prospect data.
3.  **Research Agent:** Scrapes target websites. Extracts business signals.
4.  **Qualification Agent:** Applies deterministic Lead Scoring based on ICP rules.
5.  **Outreach Agent:** Drafts personalized messages utilizing gathered evidence.
6.  **Reply Agent:** Classifies inbound intent (INTERESTED, PRICING_REQUEST, OPT_OUT).
7.  **Proposal Agent:** Fills verified pricing and service templates.

## 3. Deterministic Pipeline State Machine
Managed in PostgreSQL. LLMs can recommend state changes, but the backend API enforces valid transitions.

`NEW -> RESEARCHING -> QUALIFIED -> OUTREACH_READY -> CONTACTED -> WAITING -> REPLIED -> INTERESTED -> PROPOSAL -> WON / LOST / DO_NOT_CONTACT`

## 4. Database Schema (Core Entities)
- **Tenant/User:** Config (ICP, Budget, Prompts, Active Channels)
- **Prospect:** Name, Website, Location, Score, Pipeline State, Evidence (JSON)
- **Campaign:** Rules, Limits, Automation Level
- **Message:** Channel, Direction (In/Out), Content, Status
- **AgentTrace:** Logs every tool call and decision for observability.
