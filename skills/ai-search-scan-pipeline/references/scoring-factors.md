# Scan scoring and factor definitions

Score each factor from 0 to 100 using only evidence available in the scan.
For missing or indirect evidence, score conservatively and say it could not
be verified. Never present an estimate as a measured result.

## Nine scan factors

| # | Key | Factor | Evidence to use |
|---|---|---|---|
| 1 | `backlinks` | Domain Authority Signals | Third-party citations or presence evidence; indirect when no backlink data is available |
| 2 | `homepage_traffic` | Search Visibility | Demand and visibility signals; indirect unless traffic was actually measured |
| 3 | `social_proof` | Reddit & Quora Presence | Observed organic mentions from the presence sweep |
| 4 | `depth` | Content Depth | Homepage word count and excerpt richness |
| 5 | `structure` | Structure & Extractability | H1/H2 headings, JSON-LD types, and markup extractability |
| 6 | `freshness` | Content Freshness | Sitemap presence and most recent `<lastmod>` |
| 7 | `faq` | FAQ & Question Coverage | Whether crawled content answers the buying questions tested |
| 8 | `reviews` | Review Platform Presence | Observed review platforms, ratings, and counts |
| 9 | `speed` | Page Speed | Measured homepage time-to-first-byte (TTFB) |

For each factor, provide its score, one sentence of concrete evidence, and a
specific fix. A `fix_prompt` should name the scanned domain and cite actual
findings, describe the desired end state, and require no other context. If a
code change is not appropriate, give an actionable plan or draft content.

## Other scan findings

- **AI visibility:** outcomes for each buying question, including whether
  each assistant recommended the business and which alternatives were
  actually named.
- **Agent readiness:** optional score, label, reported issues, and source
  link when available.
- **Overall score, headline, summary, and three priority fixes.**

## Special verdicts

- **Bot-blocked:** the site serves a browser but rejects the identified
  crawler. Treat this as a negative signal for AI crawler access and suggest
  checking the site's bot or firewall rules.
- **Uncrawlable:** both bot and browser requests are refused. Base the report
  on fallback research, mark on-site factors unverifiable, and explain the
  limitation clearly.
- **Malformed JSON-LD:** do not treat parsing failure as proof of valid
  structured data. Surface it as a structure issue when supported by the
  crawl evidence.

Compose the scored result with `references/report-format.md`; that file owns
the plain-text layout, the section order, and the writing rules.
