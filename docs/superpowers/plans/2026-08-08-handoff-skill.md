# Handoff Skill & Plugin Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: implement this plan task-by-task with the sub-skill named under "Execution Handoff" — superpowers:subagent-driven-development (recommended) or superpowers:executing-plans for a sequential plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the empty `claude-skills` repo into an installable Claude Code plugin marketplace whose first skill, `handoff`, writes a minimal cross-session handoff file.

**Architecture:** A single plugin (`dev-skills`) sourced from the repo root, holding skills under `skills/<name>/SKILL.md`. The `handoff` skill is pure procedure — a six-step checklist plus a classification table and a file template. No code, no runtime, no dependencies.

**Tech Stack:** Markdown (SKILL.md), JSON (plugin manifests), git.

**Execution:** Sequential subagents

**Spec:** `docs/superpowers/specs/2026-08-08-handoff-skill-design.html`

## Global Constraints

Copied verbatim from spec §7. Every task's requirements implicitly include these.

- No absolute paths, drive letters, or home directories in any `SKILL.md`.
- No usernames, company names, or project names anywhere in the repo. The GitHub org/repo slug `patogeno/claude-skills` is permitted — it is the public install path.
- No secrets, tokens, hostnames, or internal URLs anywhere in the repo.
- Skill procedures that write files must never assume a directory exists — state the fallback.
- No OS-specific shell syntax in skill instructions (no PowerShell-only or bash-only commands).
- Marketplace name is `patogeno-claude-skills`; plugin name is `dev-skills`; skill name is `handoff`. These three identifiers must match across every file that names them.

## File Structure

| File | Responsibility |
|------|----------------|
| `.claude-plugin/marketplace.json` | Marketplace metadata + the list of plugins it offers. |
| `.claude-plugin/plugin.json` | The `dev-skills` plugin's own manifest. |
| `skills/handoff/SKILL.md` | The entire handoff procedure. The deliverable. |
| `README.md` | Install instructions + the repo conventions from Global Constraints. |
| `LICENSE` | MIT. |
| `.gitignore` | OS/editor noise only. |

---

### Task 1: Plugin scaffold and repo hygiene

Makes the repo installable. Nothing in this task depends on the skill's content, and the skill's content depends on none of it — but the plugin must load before the skill can be tested end-to-end in Task 4.

**Files:**
- Create: `.claude-plugin/marketplace.json`
- Create: `.claude-plugin/plugin.json`
- Create: `.gitignore`
- Create: `LICENSE`

**Interfaces:**
- Consumes: nothing.
- Produces: the identifiers `patogeno-claude-skills` (marketplace), `dev-skills` (plugin). Task 3 quotes both in install commands; Task 4 uses both to verify.

- [ ] **Step 1: Write `.claude-plugin/plugin.json`**

```json
{
  "name": "dev-skills",
  "description": "Project-agnostic Claude Code skills for development workflows.",
  "version": "0.1.0",
  "author": {
    "name": "patogeno",
    "url": "https://github.com/patogeno"
  },
  "homepage": "https://github.com/patogeno/claude-skills",
  "repository": "https://github.com/patogeno/claude-skills",
  "license": "MIT",
  "keywords": ["skills", "workflow", "handoff"]
}
```

- [ ] **Step 2: Write `.claude-plugin/marketplace.json`**

```json
{
  "name": "patogeno-claude-skills",
  "owner": {
    "name": "patogeno",
    "url": "https://github.com/patogeno"
  },
  "metadata": {
    "description": "Generic, reusable Claude Code skills for software development.",
    "version": "0.1.0"
  },
  "plugins": [
    {
      "name": "dev-skills",
      "source": "./",
      "description": "Project-agnostic Claude Code skills for development workflows. Includes: handoff.",
      "category": "workflow",
      "keywords": ["skills", "workflow", "handoff"]
    }
  ]
}
```

- [ ] **Step 3: Verify both manifests are valid JSON**

Run:

```bash
node -e "JSON.parse(require('fs').readFileSync('.claude-plugin/plugin.json','utf8')); JSON.parse(require('fs').readFileSync('.claude-plugin/marketplace.json','utf8')); console.log('both valid')"
```

Expected: `both valid`. If `node` is unavailable, use `python -c "import json;[json.load(open(p)) for p in ['.claude-plugin/plugin.json','.claude-plugin/marketplace.json']];print('both valid')"`.

- [ ] **Step 4: Write `.gitignore`**

```gitignore
# OS
.DS_Store
Thumbs.db
desktop.ini

# Editors
.vscode/
.idea/
*.swp

# Local Claude Code state
.claude/settings.local.json
```

- [ ] **Step 5: Write `LICENSE`**

Standard MIT text, `Copyright (c) 2026 patogeno`. No email address.

- [ ] **Step 6: Commit**

```bash
git add .claude-plugin .gitignore LICENSE
git commit -m "Add plugin marketplace scaffold, license, and gitignore"
```

---

### Task 2: The `handoff` skill

The deliverable. Everything the spec describes in §3–§6 lives in this one file.

**Files:**
- Create: `skills/handoff/SKILL.md`
- Reference: `docs/superpowers/specs/2026-08-08-handoff-skill-design.html` (§3 procedure, §4 classification table, §5 file contract, §6 verification)

**Interfaces:**
- Consumes: the plugin scaffold from Task 1 (the skill is only discoverable once `dev-skills` loads).
- Produces: skill name `handoff`, invoked as `/handoff` (fallback `/dev-skills:handoff`). Task 3 documents this name; Task 4 invokes it.

- [ ] **Step 1: Write the frontmatter verbatim**

```markdown
---
name: handoff
description: Use when ending a work session that a new Claude Code session will continue - on "/handoff", "hand off", "handoff to the next session", "wrap up for a new session", or "prepare context for a fresh session". Flushes durable knowledge into the project's own working documents, then writes one small handoff file the next session resumes from with a one-line prompt.
---
```

The description must name the trigger phrases explicitly — that string is the only thing a future session matches on when deciding whether to invoke this skill.

- [ ] **Step 2: Write the Overview and the anti-redundancy contract**

Two short paragraphs stating the exclusion principle from spec §1: the handoff carries only what no document in the project already carries; everything else is referenced by path and section. Follow with the success criterion callout: the next session needs no explanation beyond `Read <path> and continue.`

- [ ] **Step 3: Write the six-step checklist**

Reproduce spec §3's table as an ordered checklist, instructing the session to create one todo per step and complete them in order. The six steps, in order: inventory working documents; classify session knowledge; flush durable knowledge; write the handoff; redundancy verification; emit the resume prompt.

Include the topic-and-path resolution rule from spec §3: topic derived from (in order) the skill argument, the plan document being executed, the branch name, the session's dominant subject. Handoffs live in `docs/handoffs/`, created if absent — never fall back to the project root. One living file per topic, rewritten in place.

- [ ] **Step 4: Reproduce the classification table verbatim**

Copy the ten-row table from spec §4 — knowledge / destination / kind — as a Markdown table. This is the reference the session consults during step 2 of the checklist.

Follow it with the rule that keeps the handoff small, stated as its own callout:

> A durable fact with no home does not become a handoff bullet. It becomes a document — a new plan file, a new spec section, a new `CLAUDE.md` line. The handoff is not a landfill for homeless knowledge.

- [ ] **Step 5: Write the handoff file template verbatim**

```markdown
# Handoff: <topic>

**Goal:** <the outcome that ends this multi-session effort>
**Status:** <where the work actually stands, 1–2 sentences>

## Start here
1. Read <path> §<section> — <why>
2. <first concrete action>

## Orientation
| Document | Holds | Read when |

## Not written anywhere else
<facts that exist in no document — delete ruthlessly>

## Do not
- <what wastes the next session's time or breaks something>

## Open questions for the user

## Environment
<only if non-obvious>
```

Add the section table from spec §5 marking which sections are droppable, and the rule: an empty section is deleted, never filled with "N/A" or a placeholder.

- [ ] **Step 6: Write the size rule as a diagnostic**

State the 80-line limit and — critically — that exceeding it means durable knowledge was not flushed, so the correct response is to return to checklist step 3, not to trim prose or raise the limit.

- [ ] **Step 7: Write the verification step and the exit**

The two questions from spec §6: per line, "is this already stated in a working document?" (delete, replace with a path-and-section reference); of "Start here", "could a session with zero memory act on step 1 immediately?" (if not, make it concrete).

Then the exit: print the resume prompt as a single copyable line and nothing else —

```
Read docs/handoffs/handoff-<topic>.md and continue.
```

- [ ] **Step 8: Write the Red Flags table**

A two-column table of rationalizations and their rebuttals, matching the style of other skills in the ecosystem. Cover at minimum: "I'll just paste the current state in, it's faster" / "The next session might want the full history" / "There's no plan doc, so it all goes in the handoff" / "This gotcha is important, I'll put it in both places" / "The handoff is only 120 lines, close enough".

- [ ] **Step 9: Write the secrets warning**

One line: never copy credentials, tokens, or API keys into the handoff file — handoffs are frequently committed.

- [ ] **Step 10: Verify the skill against Global Constraints**

Run:

```bash
grep -nEi "C:\\\\|D:\\\\|/home/|/Users/|patri|patosoto|powershell|Get-ChildItem" skills/handoff/SKILL.md
```

Expected: no output. Any hit is a Global Constraints violation — fix it before committing.

- [ ] **Step 11: Verify the frontmatter parses and the file is self-consistent**

Read the file start to finish and confirm: frontmatter is a valid YAML block delimited by `---`; `name:` is exactly `handoff`; the six checklist steps match the six described in steps 3–7 above; every section referenced in the template appears in the droppable table.

- [ ] **Step 12: Commit**

```bash
git add skills/handoff/SKILL.md
git commit -m "Add handoff skill"
```

---

### Task 3: README

Makes the repo usable by someone who lands on it cold, and records the conventions that keep later skills generic.

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: marketplace name `patogeno-claude-skills` and plugin name `dev-skills` from Task 1; skill name `handoff` from Task 2.
- Produces: nothing downstream.

- [ ] **Step 1: Write the install section**

```markdown
## Install

In Claude Code:

    /plugin marketplace add patogeno/claude-skills
    /plugin install dev-skills@patogeno-claude-skills

Update later with `/plugin marketplace update patogeno-claude-skills`.
```

- [ ] **Step 2: Write the skills table**

One row per skill: name, invocation, one-line purpose. Currently one row — `handoff`, `/handoff`, "Hand work off to the next Claude Code session with a minimal, non-redundant handoff file."

- [ ] **Step 3: Write the `handoff` usage section**

Show the three-beat flow end to end: run `/handoff` (optionally with a topic), the skill updates working docs and writes `docs/handoffs/handoff-<topic>.md`, it prints a one-line prompt to paste into the next session.

- [ ] **Step 4: Write the Conventions section**

Reproduce the Global Constraints of this plan as repo conventions, framed as rules for anyone adding a skill: no absolute paths, no personal or project identifiers, no secrets, no assumed directories, no OS-specific shell syntax. State that every skill here must work unmodified in any project.

- [ ] **Step 5: Verify the README contains no private data**

Run:

```bash
grep -nEi "C:\\\\|D:\\\\|/home/|/Users/|patri|patosoto|@gmail" README.md
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add README.md
git commit -m "Add README with install instructions and repo conventions"
```

---

### Task 4: End-to-end verification

Proves the plugin actually loads and the skill actually triggers, rather than assuming it from well-formed files.

**Files:**
- Modify: none (verification only; fixes land in the file that failed)

**Interfaces:**
- Consumes: everything from Tasks 1–3.
- Produces: a pass/fail verdict reported to the user with the commands run and their output.

- [ ] **Step 1: Confirm the working tree is clean and the structure is complete**

```bash
git status --short && git ls-files
```

Expected: no uncommitted changes; the file list contains `.claude-plugin/marketplace.json`, `.claude-plugin/plugin.json`, `skills/handoff/SKILL.md`, `README.md`, `LICENSE`, `.gitignore`.

- [ ] **Step 2: Add the local checkout as a marketplace**

Run `/plugin marketplace add .` from this repo, then `/plugin install dev-skills@patogeno-claude-skills`.

Expected: the marketplace registers and the plugin installs without a manifest error. A schema complaint here means a field name in Task 1 is wrong — fix `.claude-plugin/*.json`, not the skill.

- [ ] **Step 3: Confirm the skill is listed**

Run `/plugin` and inspect the installed plugin's skills, or check that `handoff` appears in the available-skills list.

Expected: `handoff` is present with the description written in Task 2.

- [ ] **Step 4: Report the verdict**

Report to the user: which commands were run, their actual output, and whether the skill is installed and listed. If any step failed, report the failure and what it implicates — do not describe the work as complete.

- [ ] **Step 5: Push to GitHub**

Only after the user confirms they want it published:

```bash
git remote add origin https://github.com/patogeno/claude-skills.git
git push -u origin main
```

---

## Self-Review

**Spec coverage:**

| Spec section | Covered by |
|---|---|
| §2 Repository layout | Task 1 (manifests, gitignore, license), Task 3 (README) |
| §3 Skill procedure + topic resolution | Task 2 steps 3 |
| §4 Classification model + "no landfill" rule | Task 2 step 4 |
| §5 Handoff file contract + droppable sections + size limit | Task 2 steps 5–6 |
| §6 Verification & exit | Task 2 step 7 |
| §7 Public-repo constraints | Global Constraints; enforced Task 2 step 10, Task 3 steps 4–5 |
| §8 Out of scope | No task — correctly absent |

No gaps.

**Placeholder scan:** The angle-bracket tokens in the Task 2 step 5 template are the literal content of the template, not plan placeholders. No TBDs elsewhere.

**Identifier consistency:** `patogeno-claude-skills`, `dev-skills`, `handoff` used identically in Tasks 1, 3, and 4.
