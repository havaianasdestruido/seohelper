# AGENTS.md

The instructions for working in this repository live in [CLAUDE.md](CLAUDE.md),
which is the single source of truth for the repo map, the content rules, and
the maintenance workflows.

Short version:

- `skills/ai-search-scan-pipeline/` is the deliverable. Keep every file in it
  reachable from `SKILL.md`.
- `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` carry the
  install ids. Their names must stay in step.
- `.claude/` configures work on this repo. It is not shipped to users.
- Run `node scripts/validate.mjs` after any change under `skills/`,
  `.claude/`, or `.claude-plugin/`.
- Never put an em dash in generated report text, in `examples/`, or in
  `references/report-format.md`.
