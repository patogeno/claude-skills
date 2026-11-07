---
name: handoff
description: Use when ending a work session that a new Claude Code session will continue - on "/handoff", "hand off", "handoff to the next session", "wrap up for a new session", "prepare context for a fresh session", or when multi-session work must survive a context reset. Produces a handoff document the next session reads to resume.
---

# Handing Off to the Next Session

## Overview

A handoff file is defined by **exclusion**: it carries only what no document in the project already carries, and references everything else by path and section.

Restating the plan is what breaks a handoff. Two copies of the same status drift apart, the next session cannot tell which is authoritative, and the few facts that existed *only* in the ending session's context get buried inside the restatement.

**Announce at start:** "Using the handoff skill to hand this work to the next session."

## Checklist

Create one todo per step. Complete them in order.

1. Inventory working documents
2. Classify session knowledge
3. Flush durable knowledge into the documents that own it
4. Write the handoff file
5. Verify non-redundancy
6. Emit the resume prompt

---

## Step 1: Inventory working documents

List the documents this project *actually* has, with exact paths: plans, specs, design docs, `CLAUDE.md`, `AGENTS.md`, README, ADRs, notes, task lists. Read the ones relevant to the work being handed off.

This is the map of what already exists, and every later step consults it. You cannot avoid duplicating a document you never opened.

If the project has no working documents at all, record that. Step 3 will create them.

## Step 2: Classify session knowledge

Walk what you learned this session fact by fact against this table. Every fact gets exactly one destination.

| Knowledge from the session | Destination |
|---|---|
| Task completion status; what is in progress | plan / todo document |
| A decision and its rationale | spec, or the plan's decisions section |
| A constraint discovered about the codebase | the document covering that area (create if missing) |
| A repeatable command or setup step | `CLAUDE.md` or README |
| A project convention | `CLAUDE.md` |
| A standing user preference | `CLAUDE.md` |
| An approach tried and abandoned, and why it failed | handoff |
| Environment state — branch, uncommitted work, running server, seeded data | handoff |
| What to do next, and in what order | handoff, as a pointer into the plan |
| Anything already written in any document | nowhere — reference it by path and section |

The line between the first six rows and the next three: **durable** knowledge stays true next week regardless of who works on it; **session-only** knowledge is true about this moment in the work. An abandoned approach is session-only because conditions may change and the next session could legitimately retry it. A permanent constraint that made it fail is durable and belongs in a document.

## Step 3: Flush durable knowledge into the documents that own it

Apply the edits. Tick off completed plan items, add the decision and its rationale where decisions live, record discovered constraints where someone would look for them.

**A durable fact with no home becomes a document, not a handoff bullet.** No plan document and the work spans sessions? Create the plan. A convention established this session and no `CLAUDE.md`? Create it. The handoff then points at these documents instead of carrying their content.

Follow the project's existing shape. A project that deliberately keeps everything in one README gets an addition to that README, not a `docs/` tree it never asked for.

## Step 4: Write the handoff file

**Path:** `docs/handoffs/handoff-<topic>.md`. Create `docs/handoffs/` if it does not exist.

**Topic** resolves in this order: an argument passed when invoking the skill; the plan document being executed; the branch name; the dominant subject of the session. Keep it short and kebab-cased — `auth-refactor`, `billing-migration`.

**One living file per topic.** If the file exists, rewrite it in place to describe the current state — no date suffix, no numbered chain, no appending. Git history holds the previous versions.

### The file is exactly these parts, in this order

```markdown
# Handoff: <topic>

**Goal:** <the outcome that ends this multi-session effort>
**Status:** <where the work actually stands, 1-2 sentences>

## Start here
1. Read <path> §<section> — <why>
2. <first concrete action>

## Orientation
| Document | Holds | Read when |
| --- | --- | --- |
| <path> | <what only this document answers> | <the moment it becomes relevant> |

## Not written anywhere else
- <fact that exists in no document>

## Do not
- <action that wastes time or breaks state> — <why>

## Open questions for the user
- <decision that blocks progress>

## Environment
- <non-obvious machine state>
```

| Section | Purpose | Droppable |
|---|---|---|
| Goal / Status | Orients in two lines. The only permitted restatement, and only compressed to this size. | No |
| Start here | The next session's first two moves, concrete enough to act on with zero memory. | No |
| Orientation | Which document answers which question. This is what replaces restating them. | Yes, when there is one document |
| Not written anywhere else | The payload: abandoned approaches, warnings, findings with no home. | Yes |
| Do not | Actions that would waste time or break state. | Yes |
| Open questions for the user | Decisions blocked on a human. | Yes |
| Environment | Non-obvious machine state the next session would otherwise rediscover. | Yes |

A section with no content is deleted along with its heading. "N/A", "None", and "TBD" are not entries.

**Size:** under 80 lines. Over that means durable knowledge was not flushed — **return to step 3**. The length is a symptom; trimming prose treats the symptom.

### What each kind of fact turns into

| A line you are tempted to write | What it becomes |
|---|---|
| "Tasks 1–4 are done, task 5 is in progress" | Tick them off in the plan. The handoff says `Read docs/plans/auth/plan.md §Task 5`. |
| "We chose argon2id because bcrypt truncates input at 72 bytes" | Decision and rationale go in the spec. The handoff says nothing. |
| "The suite takes 8 minutes; run `npm test -- --shard=1/4` while iterating" | Goes in `CLAUDE.md`. The handoff says nothing. |
| "I moved hashing into a DB trigger and it deadlocks under the connection pool" | Stays — no document owns an abandoned attempt. |
| "The dev database is seeded; re-running migrations wipes it" | Stays, under `## Do not`. |

### Example of a finished file

```markdown
# Handoff: auth-refactor

**Goal:** Every password hash migrated to argon2id, with rehash-on-login for legacy users.
**Status:** Hashing layer done and tested. The login-path rehash is written but its test fails.

## Start here
1. Read `docs/plans/auth/plan.md` §Task 5 — the remaining scope lives there.
2. Run `pytest tests/auth/test_rehash.py::test_rehash_on_login -v` and fix the failure.

## Orientation
| Document | Holds | Read when |
| --- | --- | --- |
| `docs/plans/auth/plan.md` | Remaining tasks, with the argon2id decision recorded under §Decisions | Before starting Task 5 |
| `docs/specs/auth.md` | Threat model and parameter choices | If tuning cost parameters |

## Not written anywhere else
- Hashing inside a DB trigger deadlocks under the connection pool. Abandoned after two attempts; the app layer is the only viable place.

## Do not
- Re-run migrations — the dev database is seeded by hand and migrations wipe it.

## Environment
- Branch `auth-refactor`, three uncommitted files under `src/auth/`.
```

## Step 5: Verify non-redundancy

Read the drafted file back and apply two tests.

**Per line: is this already stated in a working document?** If yes, delete it. When the next session still needs to know it exists, the replacement is a path-and-section reference — `see docs/plans/auth/plan.md §Task 5`, not a summary of Task 5.

**Of "Start here": could a session with zero memory of this conversation act on step 1 immediately?** "Continue the migration" fails. "Read `docs/plans/auth/plan.md` §Task 5, then run the failing test at `tests/auth/test_rehash.py::test_rehash_on_login`" passes.

Fix what fails, then re-read once. Do not loop further.

## Step 6: Emit the resume prompt

Your final message is one line, and the line is the resume prompt:

```
Read docs/handoffs/handoff-<topic>.md and continue.
```

The file carries the rest.

## Red flags

| Thought | Reality |
|---|---|
| "There's no plan doc, so it all goes in the handoff" | Then create the plan doc. Step 3 exists for this. |
| "This gotcha is important, so I'll put it in both places" | Important means it belongs in the document. The second copy is what rots. |
| "120 lines is close enough to 80" | Over 80 means step 3 was skipped. Return to step 3. |
| "I'll summarize the plan so the next session needn't open it" | The next session opening the plan is the outcome you want. |

## Never

Never copy credentials, tokens, API keys, or connection strings into the handoff file. Handoffs are frequently committed. Reference where the secret lives, never its value.
