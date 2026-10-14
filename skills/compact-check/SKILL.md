---
name: compact-check
description: Use when the user asks whether this session can be compacted - on "/compact-check", "is it ok to compact", "can I compact", "safe to compact", "should I compact now". Answers for the current session, which continues after /compact; for handing work to a new session, use handoff instead.
---

# Checking Whether It Is Safe to Compact

## Overview

`/compact` replaces this conversation with a summary. Afterwards, only what reloads from disk is certain: the system prompt, the project-root `CLAUDE.md`, auto memory (`MEMORY.md`, first 200 lines), recently modified files, and the bodies of skills already invoked. Everything else (todo lists, plan-mode plans, instructions the user gave only in chat) survives only if the summary happens to keep it.

**Compacting is safe when the files on disk, plus a short focus line, are enough to carry on without asking the user anything they have already answered.** This skill makes that true, then gives a verdict. It writes no handoff file. Claude cannot run `/compact`; the user pastes the line this skill produces.

**Announce at start:** "Using the compact-check skill to see whether this session is safe to compact."

## Checklist

Create one todo per step. Complete them in order.

1. Inventory working documents
2. Classify session knowledge
3. Flush durable knowledge into the documents that own it
4. Run the sufficiency test
5. Give the verdict

---

## Step 1: Inventory working documents

List the documents this project *actually* has, with exact paths: plans, specs, design docs, `CLAUDE.md`, `AGENTS.md`, README, ADRs, notes, task lists. Include the auto-memory folder and its `MEMORY.md` index. Read the ones relevant to the current work.

Run `git status` too. Uncommitted files survive compaction, but *why* they are uncommitted does not.

## Step 2: Classify session knowledge

Walk what you learned this session fact by fact against this table. Every fact gets exactly one destination.

| Knowledge from the session | Destination |
|---|---|
| Task completion status | plan / todo document: tick it off |
| A decision and its rationale | spec, or the plan's decisions section |
| A constraint discovered about the codebase | the document covering that area (create if missing) |
| A repeatable command, convention, or standing user preference about this project | `CLAUDE.md` |
| A fact about the user, or one that spans projects | auto memory |
| An approach tried and abandoned, and why | focus line |
| What is in progress, and the next action | focus line, as a pointer into the plan |
| Environment state: branch, why work is uncommitted, running server | focus line |
| A question waiting on the user, or a half-finished edit | **blocker** (see step 5) |
| Anything already written in any document | nowhere |

**Durable** knowledge stays true next week, whoever works on it. **Session-only** knowledge is true about this moment.

## Step 3: Flush durable knowledge into the documents that own it

Apply the edits now. Do not ask permission to tick a finished task or to record a decision the user already made. Doing that is what this skill is for.

Memory files follow the memory conventions in your system prompt: one fact per file, frontmatter, and a pointer line in `MEMORY.md`. Before writing, check that no existing file or memory already says it.

Auto memory is not a catch-all. A plan's status belongs in the plan; putting it in memory gives two copies that drift apart.

## Step 4: Run the sufficiency test

Imagine a fresh session holding only the reloaded files and a three-line summary. Walk the next ten minutes of work. Write down every point where it would:

- ask the user something they already answered,
- retry an approach already abandoned,
- not know which file or step comes next.

Each gap gets one of two fixes: write it into a document (step 3), or put it in the focus line (step 5). The focus line costs nothing to forget. Prefer the document whenever the fact is durable.

## Step 5: Give the verdict

The verdict is **NOT YET** while any of these hold:

- A question you asked the user is unanswered.
- A file edit is half done: a stub, a `pass`, a TODO you just wrote, a refactor that leaves the code broken.
- A command you started is still running and its result matters.

Otherwise the verdict is **GO**. Your final message is exactly one of these two shapes.

**GO:**

```
GO. Flushed: <what you wrote where, one line>.

/compact <focus>
```

`<focus>` is one line under ~600 characters, made of these parts in this order: the current task and its next step; the session-only facts (abandoned approaches, environment state); `Re-read first:` and the paths to open.

**NOT YET:**

```
NOT YET: <the blocker, one line>.
First: <what resolves it: the question to answer, or the edit to finish>. Then run /compact-check again.
```

### Example GO

```
GO. Flushed: ticked task 4 in docs/plan.md; DD/MM/YYYY dates and `pytest -q -x` added to CLAUDE.md.

/compact Task 5 of docs/plan.md next: add --dry-run to src/importer.py. Tasks 1-4 done, uncommitted on branch streaming-import. pandas abandoned: out of memory on the 4GB sample, so the csv module streams rows. Re-read first: docs/plan.md, CLAUDE.md, src/importer.py.
```

## Red flags

| Thought | Reality |
|---|---|
| "Files are on disk, so compacting is safe" | Files survive. Unanswered questions and half-finished stubs lose their context. NOT YET. |
| "I'll mention the open question in the GO message" | An open question is a blocker, not a footnote. NOT YET. |
| "I'll ask before ticking the plan" | Ticking a finished task is the flush. Do it. |
| "I'll put it all in memory, that always reloads" | Memory holds facts about the user and preferences. Plan status goes in the plan. |
| "The summary will keep it" | You cannot know that. Write it down or put it in the focus line. |

## Never

Never copy credentials, tokens, API keys, or connection strings into a document, memory file, or focus line. Reference where the secret lives.
