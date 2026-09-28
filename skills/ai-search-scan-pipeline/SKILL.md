---
name: ai-search-scan-pipeline
description: >
  Reference and working procedures for the AI Search Helpers scan pipeline —
  a Next.js tool that crawls a business's website, asks AI assistants
  (Claude + OpenRouter models) the buying questions real customers ask, and
  composes a 0-100 AI-search-visibility report with nine scored factors and
  copy-paste Claude Code fix prompts. Use this skill whenever a task touches
  src/lib/scan.ts, crawl.ts, abuse.ts, demand.ts, openrouter.ts, agentic.ts,
  types.ts, or the /api/scan routes — e.g. adding/reordering a pipeline
  stage, changing what the crawler extracts, adjusting a scoring factor or
  the report schema, tuning rate limits/guardrails, debugging a stuck or
  wrong scan, or changing which AI models are called.
---

# AI Search Helpers — Scan Pipeline

## What this system does

A visitor submits `url + email`. The backend crawls the site, profiles the
business, grounds test queries in real Google Autocomplete demand, asks AI
assistants the 8 buying questions a ready-to-buy customer would ask, sweeps
web presence, pulls a third-party agent-readiness score, and composes a
report (`ReportSchema` in `src/lib/types.ts`) delivered on `/r/[id]` and by
email. The scan starts at the email step of a typeform-style funnel and runs
in the background while the rest of the form collects the lead.

Load `references/*.md` on demand — don't need all of it for every task.

## Orientation map

| If the task is about... | Go to | Also read |
|---|---|---|
| Fetching/parsing the target site, SSRF, bot-vs-browser UA | `references/crawler.md` | `src/lib/crawl.ts`, `src/lib/abuse.ts` |
| Any of the 9 pipeline stages (profile, demand, queries, visibility, presence, agentic, compose, delivery) | `references/pipeline-stages.md` | `src/lib/scan.ts` |
| The 9 scoring factors, visibility table, or report JSON shape | `references/scoring-factors.md` | `src/lib/types.ts` |
| Rate limits, email/turnstile validation, caching, lite-tier geo logic | `references/guardrails.md` | `src/lib/abuse.ts`, `src/app/api/scan/route.ts` |
| Model selection, timeouts, store backend, email/CRM/newsletter delivery | `references/config-and-infra.md` | `src/lib/email.ts`, `src/lib/crm.ts`, `src/lib/store.ts` |

## End-to-end flow (memorize this before editing anything)
