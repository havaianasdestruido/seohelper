# Website scan stages (`src/lib/scan.ts`)

Structured AI calls use the shared `structured()` helper: Anthropic Messages
API, zod output format, a refusal check, and an explicit timeout. The scan
uses `SCAN_MODEL_QUERIES` and `SCAN_MODEL_COMPOSE`; lite mode uses the less
expensive model for composition.

## Stage 1 — Crawl or research fallback (5%)

Run `crawl(url)`. If the site cannot be crawled, use web search to research
the business behind the domain. Tell the report composer that on-site
signals are unverifiable, state the crawl limitation plainly, and recommend
unblocking reputable AI crawlers when the site appears to reject them. The
scan should still complete when the fallback research succeeds.

## Stage 2 — Profile the business (15%)

Build a profile with the business name, category, location, services, and
buying questions. Questions should sound like what a real consumer asks
when ready to buy, including a location for a local business.

## Stage 3 — Ground questions in real demand (22%)

Build seed phrases from the business's services and category. Include
phrasing such as “best {service}”, “{service} near me”, “{service} {city}”,
“how much does {service} cost”, and “who does {service}”. Omit location
when unknown.

Query Google Autocomplete with a six-second timeout and limit concurrency.
Deduplicate phrases case-insensitively, cap the result set at 120 phrases,
and preserve which real search phrase supports each question.

## Stage 4 — Select the test questions

Select eight buying-intent questions from the real search phrases and
business profile:

- Prefer natural questions grounded in real phrases, with a location when
  applicable.
- Quote the exact supporting search phrase(s) for each question.
- Use at most two inferred questions when demand phrases do not cover an
  important service, and label them as inferred.
- If demand data is unavailable, use the profile's questions and identify
  them as inferred.
- Lite mode tests the first four questions only.

## Stage 5 — Ask AI assistants (30–65%)

Run the planned questions concurrently, up to four at a time. Ask each
assistant to answer as it would to a consumer seeking current business
recommendations, using web search when available. Keep each answer concise.

Claude uses the configured web-search tool. Handle multi-turn search
responses where required. Optional OpenRouter assistants use
`OPENROUTER_MODELS`; skip them in lite mode or when no key is configured.
Log and skip individual assistant failures rather than failing the whole
scan. Clearly distinguish models without web search: they measure brand
recognition, not live AI-search visibility.

For every question, retain each assistant's name and answer. This is the
core scan evidence: whether an assistant recommended the business or named
competitors instead.

## Stage 6 — Web presence sweep (70%; skipped in lite mode)

When enabled, use web search to check scan-relevant third-party evidence:

1. Review platforms and visible ratings or review counts.
2. Organic Reddit and Quora mentions.
3. Other third-party citations relevant to the business.

Report only findings that are actually observed and cite their sources.
State explicitly when a check finds no evidence. If the sweep is skipped or
fails, qualify presence-related scores as indirect or unverifiable.

## Stage 7 — Agent readiness (best effort)

Optionally retrieve or trigger a scan from is-agentic.com. Record its score,
label, report URL, and up to four reported issues with recommendations.
This check is best-effort: on any failure, omit the unavailable details and
continue the main scan.

## Stage 8 — Compose scan results (85%)

Compose the report from the business profile, crawl summary (or fallback
research), real demand phrases, every assistant answer, and any available
presence or agent-readiness evidence.

Report rules:

- Score honestly from evidence. Missing evidence means a conservative score
  and a clear note that the check was indirect or unverifiable.
- Never use an em dash in generated report text.
- State the main finding directly and address the reader as “you”.
- For each buying question, say whether the business was recommended by any
  assistant, list assistant-level outcomes, and name competitors only when
  they actually appeared in an answer.
- Include all nine scoring factors. Each needs a score from 0 to 100,
  concrete evidence, a specific fix, and a standalone `fix_prompt` that can
  be used without additional context. For a non-code fix, provide an action
  plan or draft content instead.
- End with the three highest-impact priorities for improving visibility
  over the next 60–90 days.

## Stage 9 — Return the result in chat

Return the completed scan directly as a plain-text chat message. Use simple
headings and bullets for readability, not JSON or HTML. Include the score,
key visibility findings, factor scores with evidence and fixes, and the top
priorities. If a scan stage failed, say what could not be verified and
continue with the evidence that remains.
