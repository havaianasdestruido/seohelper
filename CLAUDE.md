# CLAUDE.md

Guidance for Claude Code in this repository.

## What this repo is

`seohelper` packages the **AI Search Helpers website scan** as an installable
Claude Code plugin and Agent Skill. The deliverable is skill content: the
instructions and reference files that tell an agent how to crawl a business
site, test it against real customer buying questions, score the evidence, and
return a plain-text report in chat.

There is no application code here. The reference files describe the behavior
of a separate scan implementation that lives in the AI Search Helpers app, so
treat those references as the spec and keep them precise.

## Repo map

```
.claude-plugin/
  plugin.json           plugin manifest, owns the version and what /plugin shows
  marketplace.json      self-hosted catalog so /plugin marketplace add works
.claude/                config for working on this repo, not shipped to users
  settings.json         permissions and the PostToolUse validation hook
  agents/               subagents for repo work
  commands/             /validate, /new-reference, /release
skills/<skill-name>/
  SKILL.md              frontmatter for triggering, body for the workflow
  references/           deep detail, loaded only when a task needs it
  examples/             filled-in output samples
scripts/validate.mjs    repo checks, also runs as the edit hook and in CI
.github/workflows/      CI that runs the same checks on push and pull request
CHANGELOG.md            release history, one entry per version
```

An installed plugin loads the whole repo root, but the `skills` CLI copies
only the matching `skills/<skill-name>/` directory. Anything a skill needs at
runtime must live inside that skill directory, not at the repo root.

The repo root is the plugin root, so everything here ships to plugin users.
The dev-only pieces are inert once installed: `.claude/` is not read from a
plugin, `.github/` and `scripts/` are never invoked, and Claude Code does not
load a `CLAUDE.md` that sits at a plugin root as project context. `claude
plugin tag` prints a reminder of that last point on every release, which is
expected and not a problem to fix.

## Commands

```bash
node scripts/validate.mjs                 # repo checks, the same ones CI runs
node scripts/validate.mjs --quiet         # failures and warnings only
npx -y @anthropic-ai/claude-code@latest plugin validate .          # manifests
npx -y @anthropic-ai/claude-code@latest plugin validate . --strict # CI strictness
npx -y skills@latest add ./ --list        # what the skills CLI sees in this repo
```

Inside Claude Code, `/validate` runs both checks, `/new-reference` adds a
reference file and wires it up, and `/release` cuts a version.

## Rules

1. **Every skill file must be reachable from SKILL.md.** A reference file that
   SKILL.md never mentions is dead weight: the skill loader only follows the
   paths it is told about. Add a row to the reference table when you add a
   file, and let `scripts/validate.mjs` catch orphans.
2. **One owner per concern.** The plain-text layout lives in
   `references/report-format.md`, the nine factor definitions in
   `references/scoring-factors.md`, the stage order in
   `references/pipeline-stages.md`, the crawl internals in
   `references/crawler.md`, and model and timeout settings in
   `references/config-and-infra.md`. When a rule changes, edit its owner and
   point other files at it instead of restating it.
3. **No em dashes in output surfaces.** Generated report text and the files
   that shape it (`examples/**`, `references/report-format.md`) never use an
   em dash. Prose docs may, but the example report must model the voice the
   scan should produce.
4. **Evidence only.** Never write guidance that produces invented
   measurements, citations, ratings, or competitor names. Missing evidence
   means a conservative score plus a plain statement that the check could not
   be verified.
5. **Every outbound call needs an explicit timeout,** documented in the table
   in `references/config-and-infra.md`. Optional stages fail gracefully and
   never stop the report.
6. **Every fetch of a user-supplied host passes through `validateTarget()`,**
   including each redirect hop. This is the SSRF guard and it has no
   exceptions.
7. **Report in chat, in plain text.** The scan's only deliverable is a
   readable chat message. Never JSON, HTML, a file path, or a hosted report.
8. **Names are install ids.** The `name` in `.claude-plugin/plugin.json` must
   match the `name` of the entry in `.claude-plugin/marketplace.json`, because
   people type `plugin@marketplace` to install it. Renaming either one breaks
   existing installs.

## Checks

`scripts/validate.mjs` enforces what is mechanical: JSON validity, kebab-case
plugin name, semver, the marketplace entry matching the plugin name and
pointing at a real path, skill frontmatter (`name` matches the directory,
`description` present and under 1024 characters), every skill file referenced
from SKILL.md, no missing reference targets, no em dashes in output surfaces,
and the changelog version matching `plugin.json`.

It exits `1` on failure, `0` on warnings, and `2` in `--hook` mode. The
`PostToolUse` hook in `.claude/settings.json` runs it after edits, skips
unrelated files quickly, and feeds failures back so they get fixed in the same
turn.

Content rules 2 through 7 cannot be checked mechanically. Use the
`skill-reviewer` subagent, or `/validate`, before opening a pull request that
touches skill content.

## Workflows

**Add a reference file:** `/new-reference <skill> <topic>`, or create the file,
add a reference table row in SKILL.md, and run `node scripts/validate.mjs`.

**Change a scoring factor:** update `references/scoring-factors.md` (the
definition and evidence source) and the prompt or report text that consumes it
in `references/pipeline-stages.md` or `references/report-format.md`. The factor
list has exactly nine entries and the report always prints all nine.

**Change the report shape:** edit `references/report-format.md` and update
`examples/sample-scan-output.md` to match. Bump the minor version, since
anyone who installed the plugin should receive it.

**Add an assistant:** extend stage 5 in `references/pipeline-stages.md` and
the `OPENROUTER_MODELS` notes in `references/config-and-infra.md`. Lite mode
keeps the reduced set.

**Ship a release:** `/release minor`. That bumps `plugin.json` and the
`metadata.version` in each SKILL.md, adds the changelog entry, and validates.
Tag it with `claude plugin tag`, which checks that `plugin.json` and the
marketplace entry agree and writes a `<plugin-name>--v<version>` tag.
Marketplace installs only update when the version changes.

## Style

- Prose in short sentences, second person, active voice.
- Tables for lookups (stages, factors, timeouts, signals), prose for reasons.
- Prefer restating the *why* in one clause over repeating a rule.
- Keep SKILL.md short. It is loaded on every trigger; references are not.
