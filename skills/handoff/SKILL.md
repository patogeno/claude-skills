---
name: handoff
description: Use when ending a work session that a new Claude Code session will continue - on "/handoff", "hand off", "handoff to the next session", "wrap up for a new session", or "prepare context for a fresh session". Flushes durable knowledge into the project's own working documents, then writes one small handoff file the next session resumes from with a one-line prompt.
---

# Handing Off to the Next Session

## Overview

A handoff file is defined by **exclusion**. It carries only what no document in the project already carries. Everything else it references by path and section.

The failure mode this prevents is the fat state dump. A dump duplicates what the plan and spec already say, so the two drift apart and the next session cannot tell which is authoritative — and the handful of facts that existed *only* in the ending session's context get buried inside the restatement.

**Success criterion:** the user starts the next session with one line —

```
Read docs/handoffs/handoff-<topic>.md and continue.
```

— and needs to explain nothing further.

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

You are building the map of what already exists so that later steps can refuse to restate it. Skipping this step is what produces a redundant handoff — you cannot avoid duplicating a document you never looked at.

If the project has no working documents at all, record that. Step 3 will create them.

## Step 2: Classify session knowledge

Walk what you learned this session fact by fact against this table. Every fact gets exactly one destination.

| Knowledge from the session | Destination | Kind |
|---|---|---|
| Task completion status; what is in progress | plan / todo document | durable |
| A decision and its rationale | spec, or the plan's decisions section | durable |
| A constraint discovered about the codebase | the document covering that area (create if missing) | durable |
| A repeatable command or setup step | `CLAUDE.md` or README | durable |
| A project convention | `CLAUDE.md` | durable |
| A standing user preference | `CLAUDE.md` | durable |
| Dead end — approach tried and why it failed | handoff (unless permanent, then the relevant document) | session-only |
| Right-now environment state — branch, uncommitted work, running server, seeded data | handoff | session-only |
| What to do next, and in what order | handoff, as a pointer into the plan | session-only |
| Anything already written in any document | nowhere — reference it by path and section | noise |

The distinction that matters: **durable** knowledge is true next week regardless of who works on it; **session-only** knowledge is true right now, about this moment in the work. A dead end is session-only because the next session might legitimately retry it once conditions change; a permanent constraint that made it fail is durable.

## Step 3: Flush durable knowledge into the documents that own it

Apply the edits. Tick off completed plan items, add the decision and its rationale where decisions live, record discovered constraints where someone would look for them.

**The rule that keeps the handoff small:** a durable fact with no home does not become a handoff bullet. It becomes a document — a new plan file, a new spec section, a new `CLAUDE.md` line. The handoff is not a landfill for homeless knowledge.

So when the project has no plan document and the work is a multi-session effort, create one before writing the handoff. When a convention was established this session and no `CLAUDE.md` exists, create it. The handoff then points at these documents instead of carrying their content.

Do not invent structure the project does not want. If a project deliberately keeps everything in one README, add to that README rather than scaffolding a `docs/` tree it never asked for.

## Step 4: Write the handoff file

**Path:** `docs/handoffs/handoff-<topic>.md`. Create `docs/handoffs/` if it does not exist. Do not fall back to the project root.

**Topic** is resolved in this order of preference:

1. An argument the user passed when invoking the skill.
2. The plan document being executed (its folder or filename).
3. The branch name.
4. The dominant subject of the session.

Keep the topic short and kebab-cased: `auth-refactor`, `billing-migration`.

**One living file per topic.** If the file already exists, rewrite it in place to describe the current state. Do not add a date suffix, do not create a chain of numbered files, do not append. Git history preserves the previous versions.

### Template

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

### What each section is for

| Section | Purpose | Droppable |
|---|---|---|
| Goal / Status | Orients in two lines. The only permitted restatement, and only in compressed form. | No |
| Start here | The next session's first two moves, concrete enough to act on with zero memory. | No |
| Orientation | Map of which document answers which question — this is what replaces restating them. | Yes, if there is only one document |
| Not written anywhere else | The genuine payload: dead ends, discarded approaches, warnings. | Yes |
| Do not | Actions that would waste time or break state. | Yes |
| Open questions for the user | Decisions blocked on a human. | Yes |
| Environment | Non-obvious machine state the next session would otherwise rediscover. | Yes |

**An empty section is deleted, not filled.** Never write "N/A", "None", or "TBD" under a heading — delete the heading.

### Size

Under 80 lines. Exceeding it means durable knowledge was not flushed — **return to step 3**. Do not trim prose to fit, and do not raise the limit. The length is a symptom, not the problem.

## Step 5: Verify non-redundancy

Read the drafted file back and ask two questions.

**Per line: is this already stated in a working document?** If yes, delete it. If the next session needs to know it exists, replace it with a path-and-section reference — `see docs/plans/auth/plan.md §Task 5`, not a summary of Task 5.

**Of "Start here": could a session with zero memory of this conversation act on step 1 immediately?** "Continue the migration" fails this test. "Read `docs/plans/auth/plan.md` §Task 5, then run the failing test at `tests/auth/test_hash.py::test_rehash_on_login`" passes it.

Fix what fails, then re-read once. Do not loop further.

## Step 6: Emit the resume prompt

Print the resume prompt as a single copyable line and nothing else after it:

```
Read docs/handoffs/handoff-<topic>.md and continue.
```

Do not summarize the handoff in chat. Do not restate the next steps. The whole point is that the file carries it.

---

## Red flags

These thoughts mean stop — you are about to write a state dump.

| Thought | Reality |
|---|---|
| "I'll paste the current state in, it's faster" | Faster now, wrong next session. The plan is authoritative; a paste creates a second, stale claim. |
| "The next session might want the full history" | It wants the next action. History is in git and in the documents. |
| "There's no plan doc, so it all goes in the handoff" | Then create the plan doc. Step 3 exists for exactly this. |
| "This gotcha is important, so I'll put it in both places" | Important means it belongs in the document. Duplication is how the document rots. |
| "The handoff is only 120 lines, close enough" | Over 80 means step 3 was skipped. Go back and flush. |
| "I'll add a Status section under every heading for completeness" | Empty sections get deleted. Completeness is not the goal; actionability is. |
| "I'll summarize the plan so the next session doesn't have to open it" | The next session opening the plan is the desired outcome. |

## Never

Never copy credentials, tokens, API keys, or connection strings into the handoff file. Handoffs are frequently committed. Reference where the secret lives, never its value.
