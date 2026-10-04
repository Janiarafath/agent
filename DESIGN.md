# DESIGN.md

## Overview

This document describes the design system signals detected on the Outreach marketing site (`https://www.outreach.ai/`), titled "Agentic AI Platform for Revenue Teams | Outreach" [detected]. It is intended as a reference for AI coding agents building or extending UI that should feel consistent with the observed brand surface.

The page presents a single H1 ("Agentic AI Platform for Revenue Teams") and multiple H2 sections covering content library, customers, partners, product positioning, and platform messaging [detected]. The site is a marketing/landing surface with a strong primary CTA hierarchy ("Get a demo", "Request a demo", "Learn more", "View pricing info") [detected].

This is a **design-signal summary**, not a pixel-perfect specification. All values below are derived from the provided DesignContext only. Where evidence is thin, items are marked `[needs review]`.

## Source Structure

- **Source URL:** `https://www.outreach.ai/` [detected]
- **Final URL:** `https://www.outreach.ai/` (no redirect observed) [detected]
- **Page title:** "Agentic AI Platform for Revenue Teams | Outreach" [detected]
- **Meta description:** "Outreach is the Agentic AI platform for revenue teams — forecast, coach, close deals, and expand accounts. See it in action. Request a demo." [detected]
- **Fetch status:** HTTP 200 [detected]
- **Fetched at:** 2026-10-04T17:40:06.794Z [detected]
- **Capture profile:** `firecrawl_branding_v2` [detected]
- **Extractor version:** `url-to-design-artifact-v2-2026-06-23` [detected]
- **Screenshot available:** yes [detected]
- **Image count on page:** 31 [detected]

### Heading Outline (as detected)

- **H1:** Agentic AI Platform for Revenue Teams [detected]
- **H2s:** Content Library, Customers, Partners, "You didn't hire enough sellers. Now you don't have to.", "New Agentic AI Innovation Highlights", "Amplitude reduced their tech stack and saved big.", "One agentic AI platform for revenue teams.", "A Trusted Sales Platform", "Outreach agentic AI Platform for Revenue Teams" [detected]

### Primary Navigation / Link Groups

Top-level destinations include `why-outreach`, `platform`, `ai-agents`, `solutions/*`, `partners/*`, and `resources/*` [detected]. Feature pages referenced include pipeline management, forecasting, deal insights, account management, sales engagement, deal management, mutual action plans, conversation intelligence, and rep coaching [detected].

### CTA Inventory

- "Get a demo" [detected]
- "Request a demo" [detected]
- "Learn more" [detected]
- "Learn more about AI Powered workflows" [detected]
- "View pricing info" [detected]
- "Pricing" [detected]
- "Support Login" [detected]
- "Contact us" [detected]
- "Log in to the Partner Portal" [detected]

## Colors

| Token | Value | Role | Notes |
|---|---|---|---|
| Primary | `#5951FF` | primary | Brand violet; also used as accent [detected] |
| Secondary | `#120044` | secondary | Deep indigo/near-black [detected] |
| Accent | `#5951FF` | accent | Same value as primary [detected] |
| Background | `#FFFFFF` | background | Page background [detected] |
| Text Primary | `#120044` | textPrimary | Matches secondary [detected] |
| Link | `#A099B4` | link | Muted lavender-gray [detected] |

### Observations

- Primary and Accent share the same hex (`#5951FF`): one brand accent color [detected].
- Secondary and Text Primary share the same hex (`#120044`): single dark ink [detected].
- Link color (`#A099B4`) is lighter than Text Primary; low contrast for body text [inferred] — use for small/meta text only.
- No explicit success/warning/error/dark-mode tokens [needs review].

## Typography

- **Primary/Heading/Body family:** `Lexend` [detected]; stack `["Lexend", "sans-serif"]`.
- Reported H1/H2 sizes (17px/12.8px) are rendered/computed values, NOT design tokens [needs review] — re-derive scale from hierarchy.

## Layout

- Long-form sectioned landing: hero → content library → customers → partners → positioning → innovation highlights → case study → platform summary → trust → closing CTA [inferred].
- 31 images: media-rich hero/customer/partner/product sections [detected].
- No explicit grid/breakpoint tokens [needs review].

## Spacing / Shape / Depth

- **Base unit:** `4` (4px rhythm) [detected].
- **Border radius:** `4px` — restrained, slightly rounded, never pill [detected].
- Buttons report `shadow: none` [detected]. No elevation/gradient tokens [needs review].

## Components

### Button Primary [detected]

- Background `#5951FF`, text `#FFFFFF`, radius `4px`, shadow none.

### Button Secondary [detected]

- Background transparent, text `#FFFFFF`, border `#5951FF`, radius `4px`, shadow none.
- White-text secondary works on dark surfaces only [inferred].

## Do's And Don'ts

### Do

- Use `#5951FF` as the primary brand accent for CTAs and interactive emphasis [detected].
- Use `#120044` for primary text and dark surfaces [detected].
- Use `#FFFFFF` as the default page background [detected].
- Use `Lexend` with a `sans-serif` fallback [detected].
- Use a 4px base spacing unit and 4px border radius [detected].

### Don't (inferred for DashWin)

- No purple/blue gradients, no glassmorphism, no pill buttons.
- No decorative infinite motion; motion ≤150ms, functional only.
- No muted-lavender body text (contrast); small/meta only.
- Max 3 type sizes per section; tabular numerals for metrics.
