# claude-skills

Generic, reusable [Claude Code](https://claude.com/claude-code) skills and hooks for software development.

Everything here is project-agnostic: no absolute paths, no personal or company identifiers, no assumptions about your stack or directory layout. Install once, use in any project.

## Plugins

Each plugin installs on its own, so you take only what you want.

| Plugin | Contains | Invoke | Purpose |
|---|---|---|---|
| `handoff` | skill | `/handoff` | Hand work off to the next Claude Code session with a minimal, non-redundant handoff file. |
| `compact` | skill + hooks | `/compact-check` | Decide whether *this* session can be `/compact`ed safely; hooks re-orient Claude after compaction and log each summary. |
| `release` | skill | `/release` | Cut a release: the version bumped identically in every manifest, changelog, verification, commit, tag. |
| `publish-check` | skill | `/publish-check` | Before anything goes public, scan it for secrets, personal identifiers, machine paths and internal URLs. |
| `context-audit` | skill | `/context-audit` | Prune `CLAUDE.md`, `AGENTS.md` and auto memory of stale, duplicated and derivable entries. |
| `retro` | skill | `/retro` | Turn a session's mistakes and corrections into rules, memories, skill fixes or automation. |
| `plan-status` | skill | `/plan-status` | Read-only report of where the work stands, checking the plan against git. |

## Install

In Claude Code, add the marketplace once, then install any of the plugins:

```
/plugin marketplace add patogeno/claude-skills
/plugin install handoff@patogeno-claude-skills
/plugin install compact@patogeno-claude-skills
/plugin install release@patogeno-claude-skills
/plugin install publish-check@patogeno-claude-skills
/plugin install context-audit@patogeno-claude-skills
/plugin install retro@patogeno-claude-skills
/plugin install plan-status@patogeno-claude-skills
```

Update later with:

```
/plugin marketplace update patogeno-claude-skills
```

If a skill name clashes with another plugin, use the namespaced form, e.g. `/handoff:handoff`.

### Upgrading from earlier versions

- **From `dev-skills` (0.3.0 and earlier):** that single plugin was split up in 0.4.0. Run `/plugin uninstall dev-skills@patogeno-claude-skills`, update the marketplace, then install the plugins you want.
- **From `compact-check` or `compact-hooks` (0.4.0):** both were merged into `compact` in 0.5.0. Uninstall whichever you have, then install `compact@patogeno-claude-skills`.

`dev-skills` 0.2.x also shipped a context-usage hook that assumed a 200k window and warned that 1M sessions were nearly full. It is gone; uninstalling `dev-skills` removes it.

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

## `compact`

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

The skill never guesses the context-window size (200k or 1M); it only judges whether compacting is safe. Use `/context` to see how full the session is.

### Bundled hooks

The `compact` plugin also enables two hooks (`plugins/compact/hooks/hooks.json`, both run with `node`):

| Event | What it does |
|---|---|
| `SessionStart` (`compact`) | After compaction, tells Claude to re-read `MEMORY.md`, run `git status`, and re-open any plan or handoff file the summary mentions. |
| `PostCompact` | Appends each compaction summary, with a timestamp, to `claude-compact/compact-summaries.log` in the OS temp directory, so you can audit what was kept. |

## `release`

`/release` (optionally with a version, e.g. `/release 2.0.0`). It finds every place the project declares its version, by searching for the old version string rather than trusting a list. It picks the next version by semantic versioning unless you name one, writes it everywhere, adds a changelog entry if the project keeps one, and runs the project's tests and validators. Then it commits and tags. It pushes only when you asked to release, deploy, publish or push.

## `publish-check`

`/publish-check` before a push to a public repo, a package publish, or making a repo public. It scans exactly what will become public, including the full history when a repo goes public, for secrets, personal identifiers, absolute machine paths, internal hosts and stray files. Your own identifiers come from a gitignored private terms file (e.g. `.git-private-terms`, one term per line); the skill offers to create one. The verdict is `CLEAN`, `BLOCKED` with file and line, or `INCOMPLETE` naming what was not scanned. It never repeats a secret's value. It changes nothing itself and leaves history rewrites to you.

## `context-audit`

`/context-audit` when `CLAUDE.md` or memory has grown long or stale. It checks every entry against the repository and proposes removals, fixes and moves for anything stale, duplicated, derivable from the code, or filed in the wrong place. It shows the line counts before and after, and applies changes only after you approve them.

## `retro`

`/retro` at the end of a task, or after a session went badly. It lists what cost time (your corrections, abandoned approaches, wrong assumptions) and traces each problem to a cause. It then writes the fix where it will prevent a repeat: a `CLAUDE.md` rule, a feedback memory, a skill edit, or a hook or test when the check is mechanical.

## `plan-status`

`/plan-status` when you come back to a project. It reads the plan, any handoff file and git (branch, uncommitted work, unmerged branches, stashes) and reports what is done, in progress and next. It also flags tasks that look done but aren't ticked, and ticked tasks with no evidence. It is read-only.

## Conventions for skills in this repo

The repo is public and its skills must work unmodified in anyone's project. Every skill added here follows these rules:

- **No absolute paths**, drive letters, or home directories.
- **No usernames, company names, or project names.**
- **No secrets**, tokens, hostnames, or internal URLs.
- **No assumed directories.** A skill that writes files states what happens when the directory does not exist.
- **No OS-specific shell syntax** in skill instructions — nothing that only runs on one platform.

## Repo layout

```
.claude-plugin/marketplace.json           lists every plugin below
plugins/<plugin>/.claude-plugin/plugin.json   one manifest per plugin (own version)
plugins/<plugin>/skills/<name>/SKILL.md       a skill plugin
plugins/<plugin>/hooks/hooks.json             hooks shipped with a plugin
docs/superpowers/                         design specs and implementation plans
```

## License

MIT
