---
name: plan-status
description: Use when returning to a project and needing to know where the work stands against its plan and git - on "/plan-status", "where are we", "what's left", "catch me up", "what was I doing", "status of the plan". For writing state down at the end of a session, use handoff instead.
---

# Reporting Where the Work Stands

## Overview

Plans say what should be done, git says what was done, and the two drift apart. This skill reads both and reports the real status. It changes nothing: no ticking boxes, no commits, no builds, no edits. Discrepancies are reported, and fixed only if the user asks.

**Announce at start:** "Using the plan-status skill to report where the work stands."

## Step 1: Find the sources

- **Plans, specs and task lists** in `docs/`, `plans/`, the root, and any path `CLAUDE.md` or the README names.
- **Handoff files:** `docs/handoffs/handoff-*.md`.
- **Git**, compared with the default branch: current branch, `git --no-optional-locks status`, commits on this branch not on the default branch (`git log <default>..HEAD`), local branches with commits not on the default branch, `git stash list`.

A directory that does not exist means none of that kind; say so.

**With several plans,** pick the current one in this order: the plan a handoff file points to; a plan whose name matches the branch; the plan with the latest commit (`git log -1 -- <path>`). If that plan is fully done, report "no active plan" and list the others.

## Step 2: Check each task against the repository

For each task, take the plan's claimed status, then look for evidence:

- **Evidence** is a commit whose diff touches the files the task names (`git log --oneline -- <path>`; add `--follow` for a single file), or those files existing with the described content.
- A commit message alone only makes a task "probably".
- If named paths no longer exist, look for a commit that moved them before calling the task undone.
- A task with steps is done only when all its steps are.

| Plan says | Repository shows | Report as |
|---|---|---|
| done | evidence | done |
| not done | evidence | **probably done, not ticked** |
| done | no evidence | **ticked, but not found** |
| not done | no evidence | open |
| either | the step is manual or external | unverifiable |

A handoff's `Status` and `Start here` are claims too. Check them against the commits made since the handoff file last changed (`git log <its last commit>..HEAD`); if they are already done, report a discrepancy.

## Step 3: Report

```
Status of <plan path> on branch <branch> (<n> ahead, <n> behind <default>):
Done: <n>/<total>. <tasks, compact>
In progress: <task> (<evidence: uncommitted files, branch>)
Next: <the first open task, with its plan reference>
Outside the plan: <uncommitted files, stashes, branches the plan does not cover, or "none">
Discrepancies: <each one, or "none">
Blockers: <open questions in the plan or handoff, or "none">
```

With no active plan, drop `Done` and `Next`, and report the branch, ahead and behind, uncommitted work, stashes, other branches, and the last five commits.

End by offering, in one line, to tick the probably-done tasks if there are any. Do not do it unasked.

## Red flags

| Thought | Reality |
|---|---|
| "The plan says done, so it's done" | Check for evidence. Plans drift. |
| "I'll tick this off while I'm here" | This skill is read-only. Offer, don't edit. |
| "The file it names is gone, so the task is open" | Look for the commit that moved it. |
| "No plan, nothing to report" | Report from git: branch, uncommitted work, stashes, recent commits. |
