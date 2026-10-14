# claude-skills

Generic, reusable [Claude Code](https://claude.com/claude-code) skills for software development.

Every skill here is project-agnostic: no absolute paths, no personal or company identifiers, no assumptions about your stack or directory layout. Install once, use in any project.

## Install

In Claude Code:

```
/plugin marketplace add patogeno/claude-skills
/plugin install dev-skills@patogeno-claude-skills
```

Update later with:

```
/plugin marketplace update patogeno-claude-skills
```

## Skills

| Skill | Invoke | Purpose |
|---|---|---|
| `handoff` | `/handoff` | Hand work off to the next Claude Code session with a minimal, non-redundant handoff file. |
| `compact-check` | `/compact-check` | Decide whether *this* session can be `/compact`ed safely, and get the `/compact` line to paste. |

## `handoff`

For work that spans several sessions. It ends a session so the next one can start from a one-line prompt.

**1. Run it**, optionally naming the topic:

```
/handoff auth-refactor
```

**2. The skill does two things, in order.** First it flushes everything *durable* into the documents that own it — ticking off plan items, recording decisions and their rationale, adding discovered constraints and conventions to `CLAUDE.md`. If a durable fact has no home, it creates one rather than parking the fact in the handoff. Then it writes `docs/handoffs/handoff-<topic>.md` containing only what no document carries: dead ends, warnings, current environment state, and a pointer to the next concrete action.

One living file per topic, rewritten each session. Under 80 lines — if it grows past that, the skill treats it as a signal that durable knowledge was not flushed and goes back to flush it.

**3. It prints a prompt to paste into the next session:**

```
Read docs/handoffs/handoff-auth-refactor.md and continue.
```

## `compact-check`

For long sessions you want to keep going. `handoff` prepares a *new* session; `compact-check` answers "is it safe to `/compact` *this* one now?"

**1. Run it** when the context is filling up (check with `/context`):

```
/compact-check
```

**2. It flushes durable knowledge, then tests sufficiency.** Decisions, conventions and plan progress go into the documents that own them (`CLAUDE.md`, the plan, the spec, auto memory). Then it asks: could a session holding only the files that reload after compaction carry on without re-asking you anything?

**3. It gives a verdict.** Either `NOT YET`, naming what blocks it (an unanswered question, a half-finished edit), or `GO` with a line to paste:

```
/compact Task 5 of docs/plan.md next: add --dry-run ... Re-read first: docs/plan.md, CLAUDE.md, src/importer.py.
```

Claude cannot run `/compact` itself; you paste the line.

### Bundled hooks

Installing the plugin also enables two hooks (`hooks/hooks.json`, both run with `node`):

| Event | What it does |
|---|---|
| `SessionStart` (`compact`) | After compaction, tells Claude to re-read `MEMORY.md`, run `git status`, and re-open any plan or handoff file the summary mentions. |
| `PostCompact` | Appends each compaction summary, with a timestamp, to `claude-compact-check/compact-summaries.log` in the OS temp directory, so you can audit what was kept. |

## Conventions for skills in this repo

The repo is public and its skills must work unmodified in anyone's project. Every skill added here follows these rules:

- **No absolute paths**, drive letters, or home directories.
- **No usernames, company names, or project names.**
- **No secrets**, tokens, hostnames, or internal URLs.
- **No assumed directories.** A skill that writes files states what happens when the directory does not exist.
- **No OS-specific shell syntax** in skill instructions — nothing that only runs on one platform.

## Repo layout

```
.claude-plugin/     plugin + marketplace manifests
skills/<name>/      one SKILL.md per skill
docs/superpowers/   design specs and implementation plans for these skills
```

## License

MIT
