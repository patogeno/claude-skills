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
