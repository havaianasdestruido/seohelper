# Plain-text chat report format

The scan has one deliverable: a finished, readable report returned directly in
the chat. This file owns the layout, the section order, and the writing rules
for that report. `references/scoring-factors.md` owns the scores that fill it.

## Composition rules

- Compose from the business profile, the crawl summary (or fallback research),
  the real demand phrases, every assistant answer, and any available presence
  or agent-readiness evidence. Use nothing else.
- Score honestly from evidence. Missing evidence means a conservative score
  and a clear note that the check was indirect or unverifiable.
- State the main finding directly and address the reader as "you".
- For each buying question, say whether the business was recommended by any
  assistant, list assistant-level outcomes, and name competitors only when
  they actually appeared in an answer.
- Include all nine scoring factors. Each needs a score from 0 to 100,
  concrete evidence, a specific fix, and a standalone `fix_prompt` that can
  be used without additional context. For a non-code fix, provide an action
  plan or draft content instead.
- End with the three highest-impact priorities for improving visibility over
  the next 60 to 90 days.

## Writing rules

- Plain text with simple headings and bullets. Never JSON, HTML, an API
  payload, or a link to a separately hosted report.
- No em dash anywhere in generated report text.
- Omit optional sections when no evidence supports them instead of inventing
  filler.
- Quote the exact supporting search phrase for each buying question, or mark
  the question as inferred.
- When a scan stage failed, say what could not be verified and continue with
  the evidence that remains.

## Outline

```
AI SEARCH SCAN: {business name} ({domain})
Overall score: {score}/100
{One-sentence headline}

AI visibility
- "{buying question}": {recommended / partially recommended / not recommended}; {assistant-level outcome and actual alternatives}
- Include the evidence phrase that grounded each question, or mark the question inferred.

Factor scores
- {Factor name}: {score}/100. Evidence: {observed evidence or what could not be verified}. Fix: {specific action}.
  Fix prompt: {standalone prompt or action plan}
- Repeat for all nine factors.

Priority fixes
1. {Highest-impact action}
2. {Next action}
3. {Third action}

Summary
{Short plain-language conclusion grounded in the scan. Add optional agent-readiness findings if available.}
```

A complete filled-in report is in `../examples/sample-scan-output.md`. Use it
to check ordering, the per-factor shape, and the level of detail expected in a
`fix_prompt`; its data is synthetic, so never copy its findings into a real
scan.
