# Models, config, infra

## Models
- Anthropic Messages API (`@anthropic-ai/sdk`), zod structured outputs.
- `SCAN_MODEL_QUERIES` / `SCAN_MODEL_COMPOSE` (default `claude-opus-5` for
  both). Queries stage makes 8+ web-search calls — low rate-limit tiers may
  want `SCAN_MODEL_QUERIES=claude-sonnet-5`.
- Web search tool: `web_search_20260209` — 3 uses per visibility query, 8
  for the presence sweep.
- OpenRouter optional: `OPENROUTER_API_KEY`, `OPENROUTER_MODELS=model|Label,…`.

## Store
- Supabase when `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
  set; else zero-config in-memory store for local dev (lost on restart).
- `POST /api/dev/seed` creates a sample report in dev.

## Execution
- `after()` on the API route, `maxDuration: 300`; progress written to the
  scan row and polled by the client.

## Delivery
- Resend (report email + operator notification).
- Optional CRM Supabase sync.
- Optional beehiiv newsletter.
- Vercel Cron follow-up (`/api/cron/followup`, 15:00 UTC, Bearer `CRON_SECRET`).

## White-label
All customer-facing surfaces read `NEXT_PUBLIC_BRAND_*` env vars (name,
domain, accent, tagline, booking URL). Don't hardcode brand strings.

## Timeout discipline — every outbound call needs an explicit `AbortSignal.timeout`

| Call | Timeout |
|---|---|
| Google Autocomplete | 6s |
| Sitemap fetch | 8s |
| is-agentic.com report fetch | 10s |
| Crawl fetches (homepage/hops) | 15s |
| OpenRouter / is-agentic SSE scan | 120s |
| Anthropic structured calls | 180s |

Plus SDK-level retries. A new outbound call without a timeout can hang an
entire scan — never add one without setting this.
