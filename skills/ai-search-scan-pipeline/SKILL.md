---
name: ai-search-scan-pipeline
description: >
  Guidance for the AI Search Helpers website scan: crawl a business site,
  test AI-search visibility against real customer buying questions, score
  evidence-based findings, and return the finished results as a plain-text
  chat message. Use this skill for scan-pipeline, crawler, query, scoring,
  model, and report-output tasks.
---

# AI Search Helpers — Website Scan

## Purpose

Scan a business website and report what the evidence says about its technical
readiness and visibility in AI answers. The user provides a website URL. Return
the finished scan directly in the conversation as a readable, plain-text
report.

Keep this skill focused on website analysis and scan findings only.

Load the relevant reference only when needed:

| Task | Reference |
|---|---|
| Fetching/parsing the target site, redirects, SSRF, bot-vs-browser behavior | `references/crawler.md` |
| Scan stages, query research, AI visibility checks, and report composition | `references/pipeline-stages.md` |
| Scoring evidence, verdicts, and the chat report format | `references/scoring-factors.md` |
| Models, runtime, and outbound-call timeouts | `references/config-and-infra.md` |

## Scan flow

1. Validate and crawl the submitted website safely.
2. Profile the business and ground buying questions in real search demand.
3. Ask AI assistants those questions and record what each recommends.
4. Gather scan-related presence evidence when available.
5. Score the findings conservatively and compose the result.
6. Return the completed result as a plain-text chat message.

## Progress labels

If progress is shown, keep these stages in order:

| % | Label |
|---|---|
| 5% | Reading your website |
| 15% | Understanding your business |
| 22% | Finding what your customers actually search |
| 30% | Asking AI assistants your customers' buying questions |
| 30–65% | Checking completed questions |
| 70% | Checking web presence and citations |
| 85% | Scoring and writing your results |
| 100% | Done |

## Rules

1. Route structured AI calls through the shared `structured()` helper and
   check for refusals.
2. Every fetch of a user-supplied URL and every redirect hop must pass
   through `validateTarget()` to prevent SSRF. See `references/crawler.md`.
3. Presence research and agent-readiness checks are best-effort. If either
   fails, continue the scan and clearly qualify missing evidence.
4. Do not use an em dash in AI-generated report text.
5. Respect lite mode: four questions, no presence sweep or extra assistants,
   and the cheaper compose model. Check `LITE_SCAN_COUNTRIES` for its
   configuration.
6. Base every score on evidence actually present. When evidence is missing,
   score conservatively and say that the check could not be verified. Never
   invent measurements, citations, or competitor recommendations.
7. Return findings directly in chat as ordinary readable text with simple
   headings and bullets. Do not return JSON, HTML, an API payload, or a link
   to a separately hosted report.

## Common scan tasks

- **Change a scoring factor:** update the factor definition, scan prompt,
  and text report instructions together.
- **Add a crawl signal:** extract it in the crawler, include it in the scan
  summary, and explain exactly how it may be used as evidence.
- **Add an AI assistant:** update the visibility-query stage or the
  `OPENROUTER_MODELS` configuration.
- **Debug a slow or failed scan:** check `references/config-and-infra.md`;
  every outbound request needs an explicit timeout.
- **Change the final answer:** update the plain-text template in
  `references/scoring-factors.md` and keep the output evidence-based.
