# GrowthPilot - Product Requirements Document

## 1. Mission
Build a real, production-oriented AI sales and marketing operator that can continuously discover legitimate business opportunities, research prospects, qualify them, prepare personalized outreach, communicate through configured business channels, monitor replies, follow up, prepare proposals, maintain the sales pipeline, and report measurable results.

## 2. Core Loop
`DISCOVER -> RESEARCH -> QUALIFY -> CONTACT -> FOLLOW UP -> UNDERSTAND REPLY -> NURTURE -> PROPOSAL -> CLOSE/ESCALATE -> TRACK RESULT`

## 3. Key Principles
- **No Spam:** Outreach must be authorized, targeted, and restricted to legitimate business channels (e.g., WhatsApp Business API, authorized email).
- **No Hallucinations:** AI must rely on factual evidence. It cannot invent pain points, relationships, pricing, or metrics.
- **Deterministic Pipeline:** Pipeline states are strictly controlled by standard application logic, not by LLMs.
- **Human-in-the-Loop:** Operates with varying levels of automation (Levels 0-3), with built-in escalation paths for uncertain or high-risk situations.

## 4. Target User Persona
B2B Service Providers, Agencies, and SaaS companies who need scalable, high-quality outbound sales without hiring a massive SDR team.

## 5. Core Features
- **Configurable ICP (Ideal Customer Profile):** Users define who to target and what signals to look for.
- **Autonomous Multi-Agent System:** Specialized agents for Discovery, Research, Qualification, Outreach, and Reply handling.
- **Smart Follow-up System:** Automated sequences that instantly halt upon reply or opt-out.
- **Proposal Generation:** Creates PDF/HTML proposals dynamically based on approved templates and pricing.
- **Command Center UI:** Dashboard to view metrics, approve drafts, manage campaigns, and trigger the "Kill Switch".
