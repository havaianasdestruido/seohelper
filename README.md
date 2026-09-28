# seohelper

The **AI Search Helpers website scan**, packaged as a Claude Code plugin and
as an Agent Skill for any agent that reads `SKILL.md`.

Give your agent a website and it crawls the site, works out what customers
actually search for, asks AI assistants those buying questions, scores the
evidence, and returns a plain-text report in chat. See what a finished scan
looks like in
[`skills/ai-search-scan-pipeline/examples/sample-scan-output.md`](skills/ai-search-scan-pipeline/examples/sample-scan-output.md)
(synthetic data).

This repository is skill content. It ships instructions and references, not an
application.

## Install

### Claude Code plugin

Add the marketplace once, then install the plugin. In a session:

```
/plugin marketplace add havaianasdestruido/seohelper
/plugin install ai-search-helpers@seohelper
```

The same thing from your shell:

```bash
claude plugin marketplace add havaianasdestruido/seohelper
claude plugin install ai-search-helpers@seohelper
```

Then restart Claude Code, or run `/reload-plugins` in the session. The skill
auto-loads when a task matches, and you can run it directly with
`/ai-search-helpers:ai-search-scan-pipeline`.

Update later with:

```bash
claude plugin update ai-search-helpers
```

### Any agent, with the skills CLI

The [skills CLI](https://github.com/vercel-labs/skills) installs the same
`SKILL.md` into the directory your agent reads. Nothing is installed globally
unless you ask for it.

```bash
# See what this repo ships, without installing anything
npx skills@latest add havaianasdestruido/seohelper --list

# Interactive install, project scope, picks the agent and the skill
npx skills@latest add havaianasdestruido/seohelper

# Non-interactive install for Claude Code, skipping every prompt
npx skills@latest add havaianasdestruido/seohelper \
  --skill ai-search-scan-pipeline \
  --agent claude-code \
  --yes

# The same skill for every supported agent
npx skills@latest add havaianasdestruido/seohelper --all

# Global scope, so every project on this machine has it
npx skills@latest add -g havaianasdestruido/seohelper --skill ai-search-scan-pipeline
```

Manage what you installed with `npx skills list`, refresh with
`npx skills update`, and remove with `npx skills remove
ai-search-scan-pipeline`.

Working from a clone instead of GitHub? Point the same command at the folder:

```bash
git clone https://github.com/havaianasdestruido/seohelper
npx skills@latest add ./seohelper --list
```

### Manual copy

If you would rather place the files yourself, copy the one directory that
matters. Everything the skill needs lives inside it, including its references
and examples.

```bash
git clone https://github.com/havaianasdestruido/seohelper /tmp/seohelper
mkdir -p .claude/skills
cp -R /tmp/seohelper/skills/ai-search-scan-pipeline .claude/skills/
```

## What a scan does

| Stage | What happens |
|---|---|
| Crawl | One guarded homepage fetch and one sitemap fetch, bot identity first, browser identity as fallback, every hop re-checked against the SSRF guard |
| Profile | Business name, category, location, and services, turned into buying questions |
| Ground | Google Autocomplete turns those services into real search phrases |
| Select | Eight buying-intent questions, each quoting the phrase that grounded it. Lite mode tests four |
| Ask | AI assistants answer those questions with web search enabled. This is the core evidence |
| Sweep | Best-effort presence check: review platforms, Reddit and Quora, other citations |
| Score | Nine factors scored from observed evidence only, with a fix and a standalone fix prompt each |
| Report | A plain-text report returned in chat, ending with three priorities for the next 60 to 90 days |

The nine scored factors are domain authority signals, search visibility,
Reddit and Quora presence, content depth, structure and extractability,
content freshness, FAQ and question coverage, review platform presence, and
page speed. Definitions and evidence sources live in
[`references/scoring-factors.md`](skills/ai-search-scan-pipeline/references/scoring-factors.md).

Missing evidence never becomes a guess. The report says what could not be
verified, and a site that blocks automated access is reported as a finding
rather than a failure.

## Repository layout

```
.claude-plugin/
  plugin.json                     plugin manifest, version, install metadata
  marketplace.json                self-hosted catalog for /plugin marketplace add
.claude/                          config for developing this repo, not shipped
  settings.json                   permissions and the PostToolUse check hook
  agents/skill-reviewer.md        reviews skill changes against repo rules
  commands/                       /validate, /new-reference, /release
skills/ai-search-scan-pipeline/
  SKILL.md                        trigger description and the scan workflow
  references/                     crawler, stages, scoring, report format, config
  examples/sample-scan-output.md  a filled-in synthetic report
scripts/validate.mjs              repo checks: manifests, frontmatter, refs, style
.github/workflows/validate.yml    CI running the same checks
CLAUDE.md                         the rules this repo is held to
```

## Development

```bash
node scripts/validate.mjs                    # manifests, frontmatter, references, style
node scripts/validate.mjs --quiet            # failures and warnings only
claude plugin validate . --strict            # the authoritative manifest check
claude plugin tag --dry-run                  # what the next release would tag
```

The checks run in CI on every push and pull request, and as a `PostToolUse`
hook while editing in Claude Code, which feeds failures straight back to the
agent that made them. `.claude/commands/` holds `/validate`,
`/new-reference`, and `/release` for the common maintenance paths.

Read [`CLAUDE.md`](CLAUDE.md) before changing skill content. The two rules
that matter most: every file inside a skill must be reachable from its
`SKILL.md`, and each concern has exactly one owner file.

## License

MIT. See [`LICENSE`](LICENSE).
