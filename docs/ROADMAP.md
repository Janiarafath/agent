# GrowthPilot - Development Roadmap

## Phase 1: Foundation & Planning (Current)
- [x] Master Prompt ingestion
- [x] Initialization of System Blueprints
- [ ] Database Schema Definition (SQLAlchemy models)
- [ ] API & Tool Schema Definitions (Pydantic models)

## Phase 2: Core Backend & Demo Mode
- [ ] FastAPI setup with Celery and Redis.
- [ ] LangGraph setup (Supervisor + Research + Qualification agents).
- [ ] Implement Pipeline State Machine.
- [ ] **DEMO MODE:** Create dummy provider tools (MockSearch, MockEmail, MockWhatsApp).
- [ ] End-to-End Test: Run a fake prospect entirely through the system via API endpoints.

## Phase 3: Real Integrations & Autonomy Loop
- [ ] Replace Mock Email with real SMTP/IMAP or API provider (e.g., Resend, SendGrid).
- [ ] Replace Mock WhatsApp with official Meta Cloud API.
- [ ] Implement Daily/Hourly Cron Jobs (Celery Beat) for the autonomous loop.
- [ ] Implement the Kill Switch.

## Phase 4: Command Center Frontend
- [ ] Next.js + Tailwind setup.
- [ ] Dashboard: Metrics, Pipeline Kanban, Daily Reports.
- [ ] Inbox: View replies, handle escalations, approve drafts.
- [ ] Configuration: ICP settings, Budget Limits, Automation Levels.

## Phase 5: Hardening & Production
- [ ] Security audit (SSRF, Prompt Injection, Rate Limits).
- [ ] Dockerization.
- [ ] CI/CD pipeline.
