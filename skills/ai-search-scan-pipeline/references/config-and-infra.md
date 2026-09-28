# Scan models and runtime

## Models

- Anthropic Messages API (`@anthropic-ai/sdk`) with structured outputs.
- `SCAN_MODEL_QUERIES` and `SCAN_MODEL_COMPOSE` select the query and report
  models (both default to `claude-opus-5`). The query stage makes multiple
  web-search calls; lower rate-limit tiers may prefer a faster model.
- Web search tool: `web_search_20260209`.
- Optional OpenRouter assistants are configured with
  `OPENROUTER_API_KEY` and `OPENROUTER_MODELS=model|Label,…`.

## Scan execution

The scan may report progress while it works. Compose its final result as a
plain-text response directly in chat.

## Outbound-call timeouts

Every outbound request must have an explicit `AbortSignal.timeout` so a slow
service cannot hold up the scan indefinitely.

| Call | Timeout |
|---|---:|
| Google Autocomplete | 6s |
| Sitemap fetch | 8s |
| Agent-readiness report fetch | 10s |
| Website crawl fetches and redirect hops | 15s |
| OpenRouter / agent-readiness stream | 120s |
| Anthropic structured calls | 180s |

Keep timeout and failure handling appropriate for the scan stage. Optional
research stages should fail gracefully; they must not prevent a report from
being returned when the essential scan evidence is available.
