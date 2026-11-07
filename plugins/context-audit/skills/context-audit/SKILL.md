---
name: context-audit
description: Use when CLAUDE.md, AGENTS.md, rules files or auto memory have grown long, contradict each other, or point to files that no longer exist - on "/context-audit", "clean up CLAUDE.md", "prune memory", "my CLAUDE.md is too long", "audit instructions", "memory is out of date". Also use when Claude keeps following an instruction the user no longer wants.
---

# Auditing Always-Loaded Context

## Overview

The `CLAUDE.md` files, the files they `@import`, `.claude/rules/`, and the first 200 lines of the auto-memory `MEMORY.md` index load into context. Root files load every session; nested `CLAUDE.md` files load when Claude works in their directory. Every stale, duplicated or derivable line costs tokens each time and can mislead.

**Every line must earn its place:** true today, not discoverable from the code in a few seconds, stated once, in the right file.

**Announce at start:** "Using the context-audit skill to prune always-loaded instructions and memory."

## Checklist

Create one todo per step. Complete them in order.

1. Inventory the files
2. Verify each entry
3. Classify each entry
4. Propose the changes
5. Apply what the user approves

---

## Step 1: Inventory the files

List with exact paths and line counts:

- every `CLAUDE.md` and `CLAUDE.local.md` in the project (root, `.claude/`, nested directories);
- every file they `@import`, following nested imports (this is how an `AGENTS.md` usually gets loaded);
- `.claude/rules/*.md`;
- the auto-memory folder: its `MEMORY.md` index and each memory file.

A location that does not exist has nothing to audit; say so and move on. Audit the user-level `CLAUDE.md` only if the user asks; it affects every project.

## Step 2: Verify each entry

Check every factual claim against the repository: named files, functions, commands, scripts, flags, paths, versions. Run the cheap checks (does the file exist, does the script appear in the build config). For a missing path, search the repository and its history for a new name before calling it gone.

For memory, check that every index line points to a file that exists, that every memory file is indexed, and flag index lines past line 200: they do not load.

## Step 3: Classify each entry

| Finding | Action |
|---|---|
| True, useful, not obvious from the code | keep |
| Refers to something renamed | fix it |
| Refers to something gone, or contradicts the code | remove it |
| Derivable from the code, config or git history in seconds (directory layout, dependency list, what a file does) | remove |
| Duplicated in another file or entry | keep the copy in the right home, remove the rest |
| In the wrong home (see below) | move |
| Contradicts another entry | keep the one the code supports; ask the user only if the code does not decide |
| A narrative of a past session rather than a rule | rewrite as the rule it teaches, or remove |
| `MEMORY.md` line for a missing file | remove the line |
| Memory file not in the index | verify its content, then index it or remove it |

Right homes:

- **`CLAUDE.md`:** project commands, conventions, constraints, and standing preferences about this project. Personal ones go in `CLAUDE.local.md` when the repository is shared.
- **README:** setup for humans. `CLAUDE.md` points to it instead of repeating it.
- **Auto memory:** facts about the user and their context for this project. It is stored per project.
- **User-level `CLAUDE.md` or settings:** preferences for every project.
- **Plans:** their own status. Nowhere else.

## Step 4: Propose the changes

Present one table: file, entry (quoted briefly), action, reason. Then the line counts before and after for each file. Put the contradictions you need answered at the top.

These files hold instructions the user wrote or approved, and memory files are outside version control. Ask for one approval of the whole table, not line by line.

**If the user already said to go ahead** ("just clean it up"): skip the wait. Apply everything except unresolved contradictions, then show the table of what changed.

## Step 5: Apply the approved changes

Make the edits. Before deleting a memory file, quote its full content in your report: it has no history to restore from. Keep the `MEMORY.md` index in sync. Report the final line counts.

## Red flags

| Thought | Reality |
|---|---|
| "It's probably still true" | Check it against the repo. Unverified entries are how stale context survives. |
| "More context is safer" | Every line loads every session. Derivable facts cost tokens and drift. |
| "I'll just clean it up directly" | Propose first, unless the user already said to go ahead. |
| "The two entries roughly agree" | Then one is redundant. Keep one. |
