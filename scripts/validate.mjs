#!/usr/bin/env node
// Repo checks for the AI Search Helpers plugin.
//
//   node scripts/validate.mjs            full run, prints every result
//   node scripts/validate.mjs --quiet    prints failures and warnings only
//   node scripts/validate.mjs --hook     PostToolUse mode: reads the tool
//                                        payload on stdin, validates only when
//                                        a plugin file changed, exits 2 on
//                                        failure so Claude sees the problem
//
// Exit codes: 0 pass (warnings allowed), 1 failure, 2 failure in hook mode.

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const HOOK = args.has("--hook");
const QUIET = args.has("--quiet") || HOOK;

// Paths whose edits are worth validating. A hook on every Write or Edit stays
// cheap by ignoring everything else.
const WATCHED_DIRS = ["skills/", ".claude/", ".claude-plugin/", "scripts/"];
const WATCHED_FILES = ["SKILL.md", "CHANGELOG.md", "README.md", "CLAUDE.md", "AGENTS.md"];

const PLUGIN_MANIFEST = ".claude-plugin/plugin.json";
const MARKETPLACE_MANIFEST = ".claude-plugin/marketplace.json";
const SETTINGS = ".claude/settings.json";
const EM_DASH = "\u2014";

// Files whose text is copied into the scan's own output shape. The repo rule
// against em dashes in generated report text applies to these.
const OUTPUT_SURFACES = [
  /(^|\/)examples\/[^/]+\.md$/,
  /(^|\/)report-format\.md$/,
];

const results = [];
const ok = (m) => results.push({ level: "ok", message: m });
const warn = (m) => results.push({ level: "warn", message: m });
const fail = (m) => results.push({ level: "fail", message: m });

const rel = (p) => path.relative(ROOT, p).split(path.sep).join("/");

function listFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

function readJson(relPath, { required = true } = {}) {
  const full = path.join(ROOT, relPath);
  if (!existsSync(full)) {
    if (required) fail(`${relPath}: file is missing`);
    return null;
  }
  try {
    const parsed = JSON.parse(readFileSync(full, "utf8"));
    ok(`${relPath}: valid JSON`);
    return parsed;
  } catch (error) {
    fail(`${relPath}: invalid JSON (${error.message})`);
    return null;
  }
}

// Minimal YAML reader for skill frontmatter: top-level keys, nested one level,
// folded (>) and literal (|) blocks, and quoted or plain scalars.
function parseFrontmatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!match) return null;
  const data = {};
  let currentKey = null;
  let parent = null;
  let mode = null;

  const closeBlock = () => {
    if (currentKey && mode && typeof data[currentKey] === "string") {
      data[currentKey] = data[currentKey].trim();
    }
    currentKey = null;
    mode = null;
  };

  for (const rawLine of match[1].split(/\r?\n/)) {
    const line = rawLine.replace(/\s+$/, "");
    if (!line.trim()) {
      if (mode === "literal") data[currentKey] += "\n";
      continue;
    }
    const nested = /^\s+/.test(rawLine);
    const indentless = /^[A-Za-z0-9_-]+\s*:/.test(line) && /^[A-Za-z0-9_-]+\s*:/.test(rawLine);

    if (!nested || indentless) {
      closeBlock();
      const sep = line.indexOf(":");
      const key = line.slice(0, sep).trim();
      const value = line.slice(sep + 1).trim();
      if (value === "" ) {
        parent = key;
        mode = null;
        currentKey = key;
        data[key] = data[key] ?? {};
        continue;
      }
      if (value === ">" || value === "|") {
        parent = null;
        mode = value === ">" ? "folded" : "literal";
        currentKey = key;
        data[key] = "";
        continue;
      }
      parent = null;
      currentKey = key;
      data[key] = value.replace(/^(["'])(.*)\1$/, "$2");
      continue;
    }

    if (mode && parent === null) {
      const text = line.trim();
      if (mode === "folded") {
        data[currentKey] += (data[currentKey].endsWith("\n") || data[currentKey] === "" ? "" : " ") + text;
        if (!data[currentKey].endsWith(" ")) data[currentKey] += " ";
      } else {
        data[currentKey] += (data[currentKey] ? "\n" : "") + text;
      }
      continue;
    }

    if (parent) {
      const sep = line.indexOf(":");
      if (sep > 0) {
        const key = line.slice(0, sep).trim();
        const value = line.slice(sep + 1).trim();
        data[parent][key] = value.replace(/^(["'])(.*)\1$/, "$2");
      }
    }
  }

  closeBlock();
  return { data, body: text.slice(match[0].length) };
}

function checkManifests() {
  const manifest = readJson(PLUGIN_MANIFEST);
  const marketplace = readJson(MARKETPLACE_MANIFEST);
  readJson(SETTINGS, { required: false });

  if (manifest) {
    const { name, version, description, author, license } = manifest;
    if (!name) fail(`${PLUGIN_MANIFEST}: "name" is required`);
    else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) {
      fail(`${PLUGIN_MANIFEST}: name "${name}" is not kebab-case`);
    } else ok(`${PLUGIN_MANIFEST}: name "${name}"`);
    if (!version) warn(`${PLUGIN_MANIFEST}: no "version" set, so the marketplace cannot ship updates`);
    else if (!/^\d+\.\d+\.\d+/.test(version)) fail(`${PLUGIN_MANIFEST}: version "${version}" is not semver`);
    else ok(`${PLUGIN_MANIFEST}: version ${version}`);
    if (!description) warn(`${PLUGIN_MANIFEST}: no "description", so /plugin shows nothing for it`);
    if (!author) warn(`${PLUGIN_MANIFEST}: no "author"`);
    if (!license) warn(`${PLUGIN_MANIFEST}: no "license"`);

    if (version) checkChangelogVersion(version);
  }

  if (marketplace) {
    for (const field of ["name", "owner", "plugins"]) {
      if (!marketplace[field]) fail(`${MARKETPLACE_MANIFEST}: "${field}" is required`);
    }
    if (!Array.isArray(marketplace.plugins)) {
      fail(`${MARKETPLACE_MANIFEST}: "plugins" must be an array`);
    } else {
      marketplace.plugins.forEach((entry, index) => {
        const label = `${MARKETPLACE_MANIFEST}: plugins[${index}]`;
        if (!entry.name) fail(`${label}: "name" is required`);
        if (!entry.source) fail(`${label}: "source" is required`);
        if (typeof entry.source === "string") {
          if (!entry.source.startsWith("./")) fail(`${label}: relative source must start with "./"`);
          if (entry.source.includes("..")) fail(`${label}: source must not contain ".."`);
          const dir = path.resolve(ROOT, entry.source);
          if (!dir.startsWith(ROOT)) fail(`${label}: source escapes the marketplace root`);
          else if (!existsSync(dir)) fail(`${label}: source path does not exist (${entry.source})`);
          else {
            const nested = path.join(dir, PLUGIN_MANIFEST);
            if (existsSync(nested) && entry.name) {
              try {
                const nestedName = JSON.parse(readFileSync(nested, "utf8")).name;
                if (nestedName && nestedName !== entry.name) {
                  fail(`${label}: entry name "${entry.name}" does not match plugin.json name "${nestedName}"`);
                } else {
                  ok(`${label}: ${entry.name} -> ${entry.source}`);
                }
              } catch {
                // covered by the manifest check above
              }
            } else {
              ok(`${label}: ${entry.name} -> ${entry.source}`);
            }
          }
        }
      });
    }
  }
}

function checkChangelogVersion(version) {
  const changelog = path.join(ROOT, "CHANGELOG.md");
  if (!existsSync(changelog)) {
    warn("CHANGELOG.md: missing, so version history is only in git");
    return;
  }
  const headings = [...readFileSync(changelog, "utf8").matchAll(/^##\s+\[?v?(\d+\.\d+\.\d+)/gm)];
  const latest = headings[0]?.[1];
  if (!latest) warn("CHANGELOG.md: no versioned heading found, expected ## [1.0.0]");
  else if (latest !== version) {
    warn(`CHANGELOG.md: latest entry is ${latest} but plugin.json is ${version}; add the release entry`);
  } else ok(`CHANGELOG.md: latest entry matches plugin ${version}`);
}

function checkSkills() {
  const skillsDir = path.join(ROOT, "skills");
  if (!existsSync(skillsDir)) {
    warn("skills/: no skills in this repo yet");
    return;
  }
  const skills = readdirSync(skillsDir, { withFileTypes: true }).filter((e) => e.isDirectory());
  if (skills.length === 0) warn("skills/: no skill directories found");

  for (const skill of skills) {
    const dir = path.join(skillsDir, skill.name);
    const skillFile = path.join(dir, "SKILL.md");
    const label = `skills/${skill.name}`;
    if (!existsSync(skillFile)) {
      fail(`${label}: SKILL.md is missing`);
      continue;
    }
    const text = readFileSync(skillFile, "utf8");
    const front = parseFrontmatter(text);
    if (!front) {
      fail(`${label}/SKILL.md: no YAML frontmatter block`);
      continue;
    }
    const { name, description } = front.data;
    if (!description) fail(`${label}/SKILL.md: frontmatter needs "description"`);
    else if (description.length > 1024) fail(`${label}/SKILL.md: description is ${description.length} chars, limit is 1024`);
    else ok(`${label}/SKILL.md: description is ${description.length} chars`);
    if (name && name !== skill.name) {
      fail(`${label}/SKILL.md: name "${name}" does not match the directory name`);
    } else if (!front.body.trim()) {
      fail(`${label}/SKILL.md: body is empty after the frontmatter`);
    } else {
      ok(`${label}/SKILL.md: name matches the directory`);
    }

    const files = listFiles(dir).filter((f) => f !== skillFile);
    for (const file of files) {
      const relative = rel(file);
      const inSkill = path.relative(dir, file).split(path.sep).join("/");
      if (!text.includes(inSkill)) {
        fail(`${relative}: no skill references it, so it will never be loaded. Add it to SKILL.md`);
      } else {
        ok(`${relative}: referenced from SKILL.md`);
      }
      if (OUTPUT_SURFACES.some((re) => re.test(relative))) {
        const body = readFileSync(file, "utf8");
        if (body.includes(EM_DASH)) {
          fail(`${relative}: contains an em dash, which the scan output must never use`);
        } else {
          ok(`${relative}: free of em dashes`);
        }
      }
    }

    for (const reference of text.matchAll(/`(references\/[^`]+\.md|examples\/[^`]+\.md)`/g)) {
      const target = path.join(dir, reference[1]);
      if (!existsSync(target)) fail(`${label}/SKILL.md: points at missing ${reference[1]}`);
    }
  }
}

// In hook mode, read the PostToolUse payload on stdin and skip the run when
// the edit touched nothing this repo validates.
function hookTouchedSomethingWatched() {
  let raw = "";
  try {
    raw = readFileSync(0, "utf8");
  } catch {
    return true;
  }
  if (!raw.trim()) return true;
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return true;
  }
  const edited =
    payload?.tool_input?.file_path ??
    payload?.tool_input?.filePath ??
    payload?.tool_input?.path;
  if (typeof edited !== "string") return true;
  const normalized = path.relative(ROOT, path.resolve(ROOT, edited)).split(path.sep).join("/");
  if (normalized.startsWith("..")) return false;
  return (
    WATCHED_DIRS.some((prefix) => normalized.startsWith(prefix)) ||
    WATCHED_FILES.includes(path.posix.basename(normalized))
  );
}

if (HOOK && !hookTouchedSomethingWatched()) process.exit(0);

checkManifests();
checkSkills();

const failures = results.filter((r) => r.level === "fail");
const warnings = results.filter((r) => r.level === "warn");
const printed = QUIET ? results.filter((r) => r.level !== "ok") : results;
const width = Math.max(...printed.map((r) => r.level.length), 4);

if (!QUIET) {
  console.log(`Checking ${rel(ROOT) || "repo"}\n`);
}
for (const result of printed) {
  console.log(`${result.level.padEnd(width)}  ${result.message}`);
}

const summary = `${results.filter((r) => r.level === "ok").length} passed, ${failures.length} failed, ${warnings.length} warnings`;
if (failures.length > 0) {
  if (HOOK) {
    console.error(
      `Plugin validation found ${failures.length} problem(s):\n` +
        failures.map((f) => `- ${f.message}`).join("\n") +
        `\nRun: node scripts/validate.mjs`
    );
    process.exit(2);
  }
  console.log(`\n${summary}`);
  process.exit(1);
}
console.log(QUIET && printed.length === 0 ? "" : `\n${summary}`);
console.log("Validation passed");
process.exit(0);
