---
description: Check the plugin manifests, marketplace entry, and skill files, then fix anything that fails.
allowed-tools: Bash(node scripts/validate.mjs:*), Bash(npx -y @anthropic-ai/claude-code@latest plugin validate:*), Read, Glob, Edit
---

Validate this repo end to end and report what broke.

1. Run `node scripts/validate.mjs` and read every `fail` and `warn` line.
2. Run `npx -y @anthropic-ai/claude-code@latest plugin validate .` for the
   marketplace and plugin manifests. Use `--strict` to treat warnings as
   failures.
3. For each failure, state the file, the cause, and the smallest fix. Fix
   prose and links directly. Ask before changing a plugin or marketplace
   field, since those names are the install ids people type.
4. Re-run both commands until the run is clean, then summarize what changed.

The checks are described in CLAUDE.md under "Checks". Keep them in sync if you
add a new file type to the repo.
