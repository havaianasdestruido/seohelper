---
description: Cut a plugin release, updating the version, changelog, and skill metadata together.
argument-hint: [patch|minor|major]
allowed-tools: Read, Edit, Bash(node scripts/validate.mjs:*), Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git tag:*), Bash(claude plugin tag:*)
---

Release the next $1 version of this plugin.

1. Read `.claude-plugin/plugin.json` for the current version and `CHANGELOG.md`
   for the entry format. Default to `patch` when no argument is given. A new
   reference file or a changed rule is at least `minor`.
2. Bump `version` in `.claude-plugin/plugin.json`.
3. Bump `metadata.version` in every `skills/*/SKILL.md` so the shipped skill
   matches the plugin. Keep the two in step.
4. Add a `CHANGELOG.md` entry at the top with the new version and today's
   date, listing user-visible changes in plain language, not commit subjects.
5. Run `node scripts/validate.mjs` and confirm the changelog check passes.
6. Show the resulting diff, then propose the commit message and the tag. Run
   `claude plugin tag --dry-run` to print the tag it would create and confirm
   that `plugin.json` and the marketplace entry agree. Do not commit, tag, or
   push without approval.

Versioning exists so people who installed the plugin from the marketplace
receive the update. Editing a skill without bumping the version ships nothing.
