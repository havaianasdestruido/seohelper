# Pipeline stages (`src/lib/scan.ts`)

All AI calls run through `structured()`: Anthropic Messages API +
`zodOutputFormat`, `max_tokens: 16000`, server-side-fallback beta
(`fallbacks: "default"`), 180s timeout, `refusal` stop-reason check. Stage
models are env-overridable (`SCAN_MODEL_QUERIES`, `SCAN_MODEL_COMPOSE`,
default `claude-opus-5`). Lite mode composes with the cheaper queries model.

## Stage 1 — Crawl, or web-search fallback (5%)

`crawl(url)`. On failure, `researchBusiness()` asks Claude (web search,
≤5 searches) to research the business behind the domain (what they do,
category, location, services, sources). The composer is told explicitly
that the site refused bot *and* browser — score on-site factors
conservatively as **unverifiable**, state the block openly, and make
unblocking reputable AI crawlers the **#1 priority fix**. The scan still
completes.

## Stage 2 — Profile the business (15%)

One structured call, effort `low` → `ProfileSchema`:
`business_name, category, location, services[], buying_queries[8]`.
Rule: buying queries must be what a real consumer asks **when ready to
buy**, including location when the business is local.

## Stage 3 — Real-demand grounding (22%) — `src/lib/demand.ts`

- Build ≤18 seed queries from the profile: for each of the first 5
  services — `best {service}`, `{service} near me`, `{service} {city}`,
  `best {service} in {city}`, `how much does {service} cost`,
  `who does {service}` — plus `best {category}`, `{category} {city}`.
  (Drop city when location is unknown.)
- Query `suggestqueries.google.com/complete/search?client=chrome&q=…`
  (public Autocomplete endpoint), 6s timeout, 6 concurrent per batch.
- Rationale: autocomplete suggestions only exist because real people typed
  them — this grounds every tested query in live demand rather than
  invented phrasing.
- Dedupe case-insensitively, cap **120 phrases**, keep seed provenance.

## Stage 4 — Query plan (one structured call)

Selects the **8 buying-intent questions** to actually test, from the real
phrases + profile:
- Prefer real-phrase-grounded queries, phrased naturally, with location
  when local.
- `backed_by` must **quote the exact real phrase(s)**, e.g.
  `Real searches: 'best plumber annapolis', 'plumber near me annapolis'`.
- At most **2 inferred** queries (only if real phrases don't cover an
  important service), labeled honestly: `"Inferred from your services (no
  search data found)"`.
- No demand data reachable at all → fall back to the profiler's 8
  `buying_queries`, all labeled inferred.
- **Lite tier: first 4 queries only.**

## Stage 5 — Ask the AI assistants (30→65%)

Run each planned query **concurrently, 4 at a time**.

**a) Claude with live web search** (`runVisibilityQuery`):
> A consumer asks an AI assistant: "{query}" — answer exactly as a helpful
> AI assistant would: recommend specific, named businesses (use web search
> for real current options). Under 200 words.

`web_search_20260209`, `max_uses: 3`, `max_tokens: 4000`, effort `low`.
Handles `pause_turn` by resubmitting, up to 4 turns.

**b) OpenRouter assistants** (skipped in lite, skipped if
`OPENROUTER_API_KEY` unset): same consumer prompt to each configured model
(`OPENROUTER_MODELS=model|Label,…`, default
`openai/gpt-4o:online|ChatGPT (GPT-4o)`). 120s timeout, `max_tokens: 1200`,
failures logged + skipped. `:free` models have no web search — label these
as testing **brand recognition**, not live AI search.

Result shape per query: `answers: [{ assistant, answer }]`. This is the
core measurement of the whole product: does an AI assistant answering a
real buying question with live web search recommend this business, or a
competitor?

## Stage 6 — Web presence sweep (70%) — skipped in lite

`runPresenceSweep`: Claude + web search (`max_uses: 8`) reports on:
1. Review platforms (Google/Yelp/Trustpilot/G2/industry equivalent) —
   ratings/counts if visible.
2. Reddit & Quora organic mentions.
3. Other third-party citations.

Rule: report only what's actually found, **with sources**; state absence
explicitly — **absence is itself a finding**. Lite tier substitutes a note
telling the composer to score presence factors conservatively from crawl
signals only, and mark the check indirect.

## Stage 7 — Agent readiness (parallel to everything else)

`fetchAgenticReport()` (`src/lib/agentic.ts`) hits the free is-agentic.com
API — "how well does the site work when an AI agent tries to use it":
- `GET /api/v1/report?url=…` (10s timeout) for a stored report.
- If none: trigger a scan via SSE (`GET /api/scan/stream?target=…`,
  `Accept: text/event-stream`, 120s timeout), drain until close, re-fetch.
- Extracts `score`, `score_label`, `report_url`, top 4 `issues`
  (`name` + `recommendation`).
- **Best-effort**: any failure → `null`, section omitted. Never blocks the
  main report.

## Stage 8 — Compose the report (85%)

One structured call, effort **high** → `ReportSchema`. Inputs: profile
JSON, technical crawl summary (or the blocked-crawl verdict), every
assistant answer per query (labeled `[Assistant]`), presence findings.

Composer rules:
- **Score honestly from evidence** — never inflate or invent. Missing
  evidence (e.g. backlinks) → score conservatively, say the check was
  indirect.
- **Never use an em dash** anywhere in output text.
- `headline`: one direct second-person sentence, the core finding.
- `visibility[]`: one entry per query; `mentioned=true` only if *this
  exact business* was recommended; per-assistant `mentioned` reflects only
  that assistant's own answer; `query`/`backed_by` copied verbatim;
  `recommended_instead` lists competitor names.
- `factors[]`: all nine (see `scoring-factors.md`) — `score` (0-100), one
  sentence of concrete evidence from the actual inputs, one specific fix,
  and a standalone `fix_prompt` a user can paste into Claude Code — must
  name their real domain, cite concrete problems found (real headings,
  missing schema types, actual issues), describe the end state, need zero
  other context. Non-code fixes → an action plan or draft content instead.
- `priority_fixes`: top 3 changes to move AI visibility in 60-90 days.

**Deterministic post-processing (not AI):**
- Re-attach `backed_by` from the query plan by lowercase query match (in
  case the composer paraphrased it).
- Merge in `agent_readiness` (omit if null).
- Scan row → `status: done`, `progress: 100`.

## Stage 9 — Delivery

- **Report email** (Resend, `src/lib/email.ts`): score, headline,
  "missing from N of M buying questions", link to `/r/[id]`, booking CTA.
  All interpolated strings HTML-escaped. No-op without `RESEND_API_KEY`.
- **Lead notification** + **CRM sync** (`src/lib/crm.ts`): upsert into a
  separate CRM Supabase (company by domain + contact + note linking the
  report), deduped per scan, failures never block.
- **Newsletter** (`src/lib/newsletter.ts`): beehiiv, only when fully
  configured and disclosed at the email step; never reactivate unsubscribes.
- **Daily follow-up** (`/api/cron/followup`, Vercel Cron 15:00 UTC, Bearer
  `CRON_SECRET`): one nudge to leads 24-96h post-scan who haven't booked.

**Error path**: any failure marks the scan `error` with the message, but
the lead notification still fires — contact info was already captured.
