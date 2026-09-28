---
description: Add a reference file to a skill and wire it into SKILL.md so it actually loads.
argument-hint: <skill-name> <reference-topic>
allowed-tools: Read, Glob, Edit, Write, Bash(node scripts/validate.mjs:*)
---

Add a reference document under `skills/$1/references/` about: $2

1. Read `skills/$1/SKILL.md` and the existing references to match voice,
   heading style, table style, and level of detail.
2. Write `skills/$1/references/<kebab-topic>.md` covering only the new topic.
   If the topic already has an owner file, extend that file instead of
   creating a near-duplicate.
3. Add one row to the reference table in `skills/$1/SKILL.md` naming the task
   and the file path in backticks. A reference that SKILL.md never mentions is
   never loaded, and `scripts/validate.mjs` fails on it.
4. If the new content changes a rule that another file states, update that
   file to point here instead of repeating the rule.
5. Run `node scripts/validate.mjs` and fix anything it reports.
