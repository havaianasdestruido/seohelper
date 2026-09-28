# Scoring factors & report schema

Nine factors, keys and names fixed by the composer prompt (SE Ranking's
129k-site study of what drives AI citations). If you add/remove a factor,
update this table, `ReportSchema` in `src/lib/types.ts`, the composer
prompt, and the results-page factor cards together.

| # | key | Factor name | Feeds from |
|---|---|---|---|
| 1 | `backlinks` | Domain Authority Signals | Presence sweep; indirect — no backlink crawler, score conservatively when evidence missing |
| 2 | `homepage_traffic` | Search Visibility | Presence/demand signals (indirect) |
| 3 | `social_proof` | Reddit & Quora Presence | Presence sweep — organic mentions |
| 4 | `depth` | Content Depth | Homepage word count / excerpt richness |
| 5 | `structure` | Structure & Extractability | H1/H2 headings, JSON-LD types found/missing, markup extractability |
| 6 | `freshness` | Content Freshness | Sitemap presence + most recent `<lastmod>` |
| 7 | `faq` | FAQ & Question Coverage | Whether crawled content answers the actual buying questions tested |
| 8 | `reviews` | Review Platform Presence | Presence sweep — Google/Yelp/Trustpilot/G2/industry-equivalent, ratings, counts |
| 9 | `speed` | Page Speed | Measured homepage TTFB |

Each factor: `score` (0-100), one sentence of concrete evidence, one
specific fix, one standalone `fix_prompt`.

## Beyond the nine factors, the report also carries

- **AI visibility table** — per buying question: which assistants were
  asked, whether each recommended the business, `recommended_instead`.
- **Agent readiness** (is-agentic.com) — score, label, top issues +
  recommendations, link to full third-party report.
- **Overall score** (0-100), `headline`, `summary`, `priority_fixes` (top 3).

## Special verdicts

- **Bot-blocked** (serves browsers, refuses identified bots): significant
  negative finding — AI crawlers likely blocked too — with its own fix.
- **Uncrawlable** (refuses bot *and* browser): business researched via web
  search instead; on-site factors scored conservatively/unverifiable, the
  block stated openly, unblocking AI crawlers is the #1 priority fix.
- **Malformed JSON-LD**: silently dropped from `jsonLdTypes` — surfaces as
  a `structure` finding, not an error.

## Report schema (`src/lib/types.ts`)

```jsonc
{
  "business_name": "string",
  "overall_score": 0-100,
  "headline": "one direct second-person sentence",
  "visibility": [{
    "query": "verbatim planned query",
    "backed_by": "verbatim demand evidence",
    "mentioned": "bool — any assistant recommended the business",
    "assistants": [{ "name": "verbatim label", "mentioned": "bool — that assistant's own answer" }],
    "recommended_instead": ["competitor names"]
  }],
  "factors": [{
    "key": "backlinks|homepage_traffic|social_proof|depth|structure|freshness|faq|reviews|speed",
    "name": "…", "score": 0-100, "evidence": "…", "fix": "…", "fix_prompt": "…"
  }],
  "priority_fixes": ["3 highest-impact fixes, ordered"],
  "summary": "string",
  "agent_readiness": {            // optional
    "score": "number|null", "score_label": "…", "report_url": "…",
    "top_issues": [{ "name": "…", "recommendation": "…" }]   // max 4
  }
}

```
Stored as jsonb on the scans row (supabase/migration.sql). Rendered
on /r/[id]: score, headline, visibility cards with per-assistant
mentions, nine factor cards with copy-to-clipboard fix_prompts, agent
readiness section, booking CTA.

---

### `skills/ai-search-scan-pipeline/references/guardrails.md`


# Guardrails & abuse controls

Check this before loosening any validation or adding a new outbound call.

| Control | Detail |
|---|---|
| SSRF guard | `validateTarget()` on the initial URL **and every redirect hop** — see `crawler.md` |
| Bot policy | Identified bot UA first, browser UA fallback only; both-refused ⇒ error, research instead |
| Email validation | Syntax regex, 24-domain disposable blocklist (mailinator, guerrillamail, 10minutemail, …), live DNS **MX** lookup |
| Captcha | Optional Cloudflare Turnstile (`TURNSTILE_SECRET_KEY`); skipped when unset |
| Rate limits | `MAX_SCANS_PER_IP_PER_DAY` (default 3), `MAX_SCANS_PER_DAY` (default 50), rolling 24h, store-backed |
| Report cache | Same domain scanned in last **7 days** → reuse report, resend email, no re-scan |
| Geo cost tier | `x-vercel-ip-country` ∈ `LITE_SCAN_COUNTRIES` (default `IN`) ⇒ lite pipeline: 4 queries, no presence sweep, no extra assistants, cheaper compose model |
| HTML injection | Everything interpolated into emails is HTML-escaped |
| Scan IDs | UUID-validated before any store lookup |
| Lead PATCH | Whitelisted fields only, strings capped at 200 chars |

Rule of thumb: any new feature that (a) fetches a user-controlled URL,
(b) accepts free-form user text into an email/report, or (c) adds scan
cost, must plug into one of the rows above rather than bypass it.
