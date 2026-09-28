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
POST /api/scan { url, email, turnstileToken }
→ verify turnstile → validate email → validate target (SSRF) → rate limits
→ createLead
→ 7-day cached report for domain? → mark scan done, re-email, skip re-scan
→ after(): runScan(scanId, url, domain, { lite? }) [background]
→ after(): subscribeToNewsletter(email)

Client polls GET /api/scan/[id] → { status, step, progress }
Client PATCHes /api/scan/[id] → progressive lead fields (name/phone/qualifier)


Funnel steps: `url → email → name → phone → qualifier → progress → done`.
The scan is fired at the **email** step, not the end — later steps just
enrich the lead record while it runs.

## Progress steps (must stay in this order if you touch `scan.ts`)

| % | Step label |
|---|---|
| 5% | Reading your website |
| 15% | Understanding your business |
| 22% | Finding what your customers actually search |
| 30% | Asking AI assistants your customers' buying questions |
| 30–65% | (per completed query, concurrency 4) |
| 70% | Checking your web presence and citations |
| 85% | Scoring and writing your report |
| 100% | Done |

## Standing rules for this codebase (do not violate)

1. **Every** AI structured call goes through the `structured()` helper
   (zod output format, `refusal` stop-reason check). Don't hand-roll a raw
   Anthropic call for a new stage — extend `structured()` instead.
2. **Every** fetch of the target site or a redirect hop must pass through
   `validateTarget()` (SSRF guard). If you add a new place that fetches a
   user-supplied URL, guard it the same way — see `references/crawler.md`.
3. **Never** let a scan hard-fail because a *non-essential* stage failed:
   agent-readiness (`agentic.ts`) and the presence sweep are best-effort —
   wrap in try/catch, degrade gracefully, never block the compose stage.
4. **Never** emit an em dash in AI-generated report text — the composer
   prompt explicitly forbids it; keep that instruction if you touch the
   compose prompt.
5. **Never** interpolate AI/user text into an email without HTML-escaping.
6. Respect the **lite tier** (`LITE_SCAN_COUNTRIES`, default `IN`): 4 queries
   not 8, no presence sweep, no extra OpenRouter assistants, cheaper compose
   model. Any new expensive stage needs a lite-mode branch.
7. Respect the **7-day report cache** per domain before adding new scan cost.
8. Scoring must come from **evidence actually present in the inputs**. If
   you add a factor or evidence source, the prompt/rule must say "score
   conservatively and mark unverifiable" when that evidence is missing —
   never let the model invent numbers.

## Typical task recipes

- **"Add a 9th → 10th scoring factor"**: update `ReportSchema.factors[].key`
  enum in `src/lib/types.ts`, add the factor name + evidence rule to the
  composer system prompt in `scan.ts`, document it in
  `references/scoring-factors.md`, and update the results-page factor cards.
- **"The crawler is missing a signal I need for scoring"**: extend the
  regex extraction in `crawl.ts` (§ see `references/crawler.md`), thread it
  through `crawlSummary()`, and reference it explicitly in the composer
  prompt's evidence rules — an unused signal doesn't improve scoring.
- **"Add another AI assistant to test"**: for Anthropic, extend the
  visibility-query stage in `scan.ts`; for anything OpenRouter-compatible,
  just add to `OPENROUTER_MODELS` env — no code change needed, see
  `references/config-and-infra.md`.
- **"Scan is stuck / times out"**: check `references/config-and-infra.md`
  for the timeout table — every outbound call must have an explicit
  `AbortSignal.timeout`; a new call without one can hang the whole job.
- **"Tighten/loosen who can scan"**: `references/guardrails.md` — rate
  limits, disposable-email blocklist, Turnstile, SSRF host rules.
