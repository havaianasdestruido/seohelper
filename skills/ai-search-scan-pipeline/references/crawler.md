# Crawler reference (`src/lib/crawl.ts`, `src/lib/abuse.ts`)

The crawler is the tool's *only* direct contact with the target site: one
homepage fetch + one sitemap fetch, heavily guarded.

## Request strategy — identified bot first, browser fallback

1. Try **bot UA**: `Mozilla/5.0 (compatible; AISearchHelpersBot/1.0; +https://aisearchhelpers.com)`.
2. On a "blocked-class" status — **401, 403, 405, 406, 429, 503** — set
   `botBlocked = true` and retry the whole redirect chain with a **browser UA**
   (Chrome 128 / macOS).
3. If *both* identities are refused, throw:
   `"Site blocks automated access (bot and browser requests both refused)"`
   → pipeline falls back to web-search research (see pipeline-stages.md §1).
4. Non-OK final response after a successful identity → throw
   `"Site returned HTTP <status>"`.

Headers on every request: `accept: text/html,application/xhtml+xml,*/*`,
`accept-language: en-US,en;q=0.9`. 15s timeout per fetch.

**Why `botBlocked` matters**: a site that serves browsers but refuses an
identified bot is almost certainly blocking real AI crawlers too (GPTBot,
ClaudeBot, PerplexityBot). Treat this as a significant negative finding with
its own fix (allow reputable AI crawlers in WAF/robots rules) — inject it
into both the profiler and composer prompts, not just a log line.

## Redirects

Followed **manually**, up to 4 hops, `redirect: "manual"` — so that
**every hop re-passes `validateTarget()`**. A redirect must never bounce the
fetch onto a private/internal host. If you change redirect handling, keep
this guarantee.

## What gets extracted from the homepage

HTML truncated to 500KB before parsing (regex-based, not a full DOM parser):

| Signal | Extraction |
|---|---|
| `title` | `<title>` |
| `metaDescription` | `<meta name="description">` (either attribute order) |
| `headings` | all `<h1>`/`<h2>` text, stripped, first 40 |
| `jsonLdTypes` | every `application/ld+json` block, JSON-parsed, collects `@type` (top-level, arrays, `@graph`). **Malformed JSON-LD is silently dropped — itself a structure finding.** |
| `wordCount` | full text after stripping script/style/tags/entities |
| `htmlExcerpt` | first 20,000 chars of stripped text (profiler prompt gets first 8,000) |
| `ttfbMs` | time-to-first-byte of the final hop — the speed signal |
| `finalUrl`, `status` | post-redirect |

## Sitemap check

`GET {origin}/sitemap.xml`, 8s timeout, same guarded fetch. Counts if body
contains `<urlset>` or `<sitemapindex>`. Records the most recent `<lastmod>`
(sorted descending) as the freshness signal. Missing sitemap = a finding, not
an error — don't throw.

## SSRF guard — `validateTarget()` — apply to initial URL AND every hop

- Only `http:`/`https:`; scheme-less input gets `https://` prepended.
- Reject `localhost`, `*.local`, `*.internal`, any host with no dot.
- Reject literal private IPs:
  - IPv4: `10.x`, `127.x`, `0.x`, `172.16–31.x`, `192.168.x`,
    `169.254.x` (link-local), `100.64–127.x` (CGNAT).
  - IPv6: `::1`, `::`, `fc/fd` (ULA), `fe80` (link-local).
- Hostnames: **DNS-resolve all A/AAAA records** and reject if *any* resolved
  address is private. DNS failure → user-facing `"We couldn't reach that
  website."`

If you add any new outbound fetch of a user-supplied host, it must go
through this same function — no exceptions.

## Feeding it to the AI stages

`crawlSummary()` renders: URL + status + TTFB, bot-block warning (if any),
title, meta description, word count, headings, JSON-LD types, sitemap
presence/lastmod, and the 8,000-char excerpt. This is the entire technical
picture the profiler and composer see — if a new signal isn't in this
summary, the model can't use it.
