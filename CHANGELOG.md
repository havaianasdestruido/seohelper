# Changelog

All notable changes to this plugin are recorded here. The version in
`.claude-plugin/plugin.json` is the version people install, and a marketplace
install only updates when that number changes.

## [1.0.0] - 2026-09-28

First packaged release.

- Publish the AI Search Helpers website scan as a Claude Code plugin with a
  self-hosted marketplace, installable with `/plugin marketplace add
  havaianasdestruido/seohelper`.
- Publish the same skill for any agent through the skills CLI:
  `npx skills@latest add havaianasdestruido/seohelper`.
- Split the skill reference set so each file owns one concern: crawler
  internals, pipeline stages, scoring factors, plain-text report format, and
  model and timeout configuration.
- Add `references/report-format.md`, which now owns the report layout, the
  section order, and the writing rules that stage 8 and stage 9 point to.
- Add `examples/sample-scan-output.md`, a filled-in synthetic report that
  shows the expected level of detail, including standalone fix prompts.
- Add repo checks in `scripts/validate.mjs` and run them in CI and as a
  `PostToolUse` hook, covering manifest names and paths, skill frontmatter,
  orphaned skill files, missing reference targets, em dashes in report
  surfaces, and changelog and manifest version drift.
- Add `CLAUDE.md` with the repo map, the content rules, and the maintenance
  workflows, plus `/validate`, `/new-reference`, and `/release` commands and a
  `skill-reviewer` subagent.
