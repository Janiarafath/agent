# GrowthPilot - API & Cost Estimation

## 1. LLM Costs
*GrowthPilot relies on high-quality intelligence for Research, Qualification, and Drafting.*
- **Model Recommendation:** Anthropic Claude 3.5 Sonnet or OpenAI GPT-4o for complex reasoning (Qualification/Drafting). Claude 3 Haiku or GPT-4o-mini for simple tasks (Reply Classification).
- **Estimated Tokens per Prospect (End-to-End):** ~10,000 tokens (Input) / ~1,000 tokens (Output).
- **Estimated Cost per Prospect:** ~$0.04 to $0.06.
- **Budget Control:** System will track `tokens_used` per tenant and automatically halt the pipeline if the daily budget is exceeded. Local model support (Ollama) will be available for zero-cost operation on capable hardware.

## 2. Infrastructure Costs
- **Backend/Frontend Server:** ~$20/mo (e.g., DigitalOcean, AWS EC2, or Vercel+Render).
- **Database (PostgreSQL):** ~$15/mo (Managed DB).
- **Queue Broker (Redis):** ~$15/mo.

## 3. Tool API Costs
- **Web Scraping/Search:** (e.g., Firecrawl, Tavily, or Exa) ~$10-20/mo depending on volume.
- **WhatsApp Cloud API:** Business-initiated conversations are priced per region (e.g., ~$0.07 per conversation in NA/EU). First 1,000 service conversations are usually free.
- **Email:** SES, SendGrid, or Resend. Typically pennies per thousand emails.

## 4. Total Expected Operating Cost
For a standard agency processing ~1,000 leads per month, the estimated baseline SaaS cost + API usage will be approximately **$100 - $150 / month**, replacing the function of a human SDR.
