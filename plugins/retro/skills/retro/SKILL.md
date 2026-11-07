---
name: retro
description: Use when the user asks to capture lessons from this session - on "/retro", "retrospective", "what did we learn", "lessons learned", "make sure this doesn't happen again". Also use when the user has corrected the same mistake twice in one session.
---

# Turning a Session's Mistakes into Rules

## Overview

A lesson that lives only in the conversation is lost when the session ends, and the next session repeats the mistake. This skill finds what went wrong, traces each problem to its cause, and writes the fix where it will prevent the next occurrence. The output is changed rules, or none when nothing qualifies.

**Announce at start:** "Using the retro skill to turn this session's lessons into rules."

## Checklist

Create one todo per step. Complete them in order.

1. Collect the problems
2. Find the cause of each
3. Choose the fix and its home
4. Apply the fixes
5. Report

---

## Step 1: Collect the problems

Walk the session and list each event that cost time or trust:

- the user corrected you, or repeated an instruction;
- an assumption turned out wrong (about the code, the tools, the environment, the user's intent);
- a command or test failed for a reason that was knowable beforehand;
- a skill, hook or instruction misled you;
- work was redone, or an approach was abandoned.

Quote the user's corrections exactly. Include problems you caused, not only external ones.

## Step 2: Find the cause of each

For each problem, ask why until you reach something that can be changed: a missing fact, a wrong default, an ambiguous instruction, a check that was skipped. "I made a mistake" is not a cause.

When a tool, hook or skill misled you, also ask what you did with its output. Acting on it without checking is your part of the cause.

## Step 3: Choose the fix and its home

A problem earns a fix only if it would plausibly recur in a future session and the fix would change what is done. Every `CLAUDE.md` line costs every future session.

| The cause is | Fix | Home |
|---|---|---|
| A project fact, convention or standing preference nobody wrote down | a one-line rule | project `CLAUDE.md` (`CLAUDE.local.md` if personal and the repo is shared) |
| A fact about the user or their context for this project | a memory, following the memory conventions in your system prompt | auto memory (stored per project) |
| A preference for every project | a permission rule if it gates a tool (e.g. ask before `git push`), else a one-line rule | user settings or user-level `CLAUDE.md` |
| A skill this project or user owns was wrong or missing | edit the skill | that skill's `SKILL.md` |
| An installed plugin's skill or hook was wrong or outdated | none if updating it fixed the problem; otherwise a report for its maintainer | the report |
| Something mechanical a tool can check | a hook, test, lint rule or script | the repository or settings |
| A bug in code | a fix, or a tracked task if out of scope | the code, or the plan |
| An approach that failed for a temporary reason, or bad luck | none: session-only, a handoff note at most | the report |

An abandoned approach becomes a rule only when a permanent constraint made it fail ("pandas runs out of memory on these files"). Prefer automation over prose when the check is mechanical. Write each rule as an instruction, not a narrative: "Run `pnpm test`, not `npm test`; the workspace needs pnpm", not "Today npm failed because...".

Before writing, look in `CLAUDE.md`, memory and the relevant skill for a rule that already says it. If one does and was ignored, make that rule clearer or more prominent instead of adding a second copy.

## Step 4: Apply the fixes

Apply directly: rules and memories that record what the user said or corrected this session.

Propose and wait for approval: code fixes, tests, lint rules, hooks, permission changes, anything outside the project, and rules based on a cause you inferred rather than one the user stated.

## Step 5: Report

```
Retro: <n> problems, <n> fixes.
- <problem, one line> -> <cause> -> <fix> in <file> (applied | proposed)
- <problem> -> <cause> -> no rule: <why>
```

No qualifying problems: report `Retro: 0 problems.` and change nothing. That is a valid result.

## Red flags

| Thought | Reality |
|---|---|
| "I'll just remember next time" | The next session starts empty. Write it down. |
| "Let me describe what happened" | Write the rule it teaches. Narratives don't change behavior. |
| "Add another rule saying it again" | If an existing rule was ignored, fix that rule. |
| "I should produce at least one rule" | An empty retro is fine. A filler rule is bloat. |
| "The tool was wrong, not me" | Ask what you did with its output. |
