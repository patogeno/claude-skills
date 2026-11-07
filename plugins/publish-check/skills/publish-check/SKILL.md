---
name: publish-check
description: Use before pushing to a public repository, publishing a package, open-sourcing a project, or sharing code outside its owners - on "/publish-check", "is this safe to push", "check for secrets", "scan for personal info", "privacy check before publishing", "make this repo public", "open-source this", "npm publish". Also use when a repository is about to change from private to public. Not for bumping versions; use release.
---

# Checking Code Is Safe to Publish

## Overview

Anything pushed to a public place is copied, cached and indexed within minutes. Deleting it later does not unpublish it. This skill scans exactly what is about to become public, reports every leak by location, and gives a verdict. It proposes fixes and applies none without the user's OK.

**Announce at start:** "Using the publish-check skill to scan what is about to be published."

## Checklist

Create one todo per step. Complete them in order.

1. Define what will be published
2. Load the private terms
3. Scan
4. Review every hit
5. Give the verdict

---

## Step 1: Define what will be published

| Situation | Scope |
|---|---|
| Pushing to an existing remote branch | the commits in `git log <remote>/<branch>..HEAD`: their diffs, messages, author and committer names and emails; plus any tags being pushed |
| Pushing a branch the remote does not have | the commits in `git log HEAD --not --remotes`, same parts |
| Making a repository public | every branch, tag and full history **on the host**, including pull-request refs a normal clone lacks: scan a fresh `git clone --mirror` of the remote, not the working clone |
| Publishing a package | the contents of the files the package tool will include, after the build that publishing runs (for example the list from `npm pack --dry-run`, the built wheel or sdist) |

For packages: source maps carry absolute paths and source code; bundles can inline environment values; with an `.npmignore` present, npm ignores `.gitignore`, so gitignored files like `.env` get packed. A published version cannot really be unpublished.

## Step 2: Load the private terms

Generic patterns cannot know the user's own identifiers. Look for a private terms file: a list of the user's names, usernames, emails, company and client names, internal hostnames, one per line (a common name is `.git-private-terms`).

- If it exists, confirm it is ignored (`git check-ignore <file>` matches) and was never committed (`git log --all -- <file>` is empty). A terms file ever committed is itself a leak.
- If none exists, collect candidates yourself: `git config user.name` and `user.email`, every author and committer identity in scope, the home-directory username. Show them to the user as the terms you will check, ask for additions, and offer to save the list as `.git-private-terms` in the repository root, listed in `.git/info/exclude`.

Never print the terms themselves in your report. Report where they matched.

## Step 3: Scan

Search the scope from step 1 for each category. Search private terms and paths case-insensitively, secret patterns case-sensitively. Quote regexes in single quotes, which behave the same in bash, zsh and PowerShell.

| Category | Look for |
|---|---|
| Secrets | `sk-[A-Za-z0-9_-]{20,}`, `ghp_` `gho_` `github_pat_`, `glpat-`, `AKIA[0-9A-Z]{16}`, `ASIA[0-9A-Z]{16}`, `AIza[0-9A-Za-z_-]{35}`, `xox[abprs]-`, `sk_live_`, `npm_[A-Za-z0-9]{36}`, `_authToken` in `.npmrc`, JWTs (`eyJ[A-Za-z0-9_-]+\.eyJ`), `BEGIN ... PRIVATE KEY`, passwords in config, connection strings with credentials, `.env` files |
| Personal identifiers | every private term; any email address in files, messages and metadata (noreply addresses are intended) |
| Machine paths | home directories in any form: `/Users/<name>`, `/home/<name>`, `C:\Users\<name>`, `C:/Users/`, `C:\\Users\\` (escaped in JSON), `/c/Users/`; also in notebook outputs |
| Internal infrastructure | private hostnames, internal URLs, IP addresses, internal ticket or project codes |
| Unintended files | logs, databases, dumps, build output, editor and OS files, local settings |

As a regex, match Windows home paths with `[A-Za-z]:[\\/]+Users[\\/]+`, which covers `\`, `/` and the JSON-escaped `\\`.

If `gitleaks` or `trufflehog` is installed, run it as well; it does not replace the private-terms search.

For history, use git's own search, which works in every shell, one search per term or pattern:

- diffs: `git log --all -i -G "<regex>" --oneline --name-only`
- messages: `git log --all -i --grep="<term>" --oneline`
- identities: `git log --all --format="%h %an <%ae> %cn <%ce>"`

Limit `--all` to the step 1 range when only pushing. List commits and files first, then open individual hits; never dump whole diffs that may contain secrets.

## Step 4: Review every hit

Read each match in context. Classify it as **leak** (must not be published), **intended** (public on purpose: the author name in a license, a documented example key like `sk-example`), or **false positive**. When unsure, count it as a leak and ask.

## Step 5: Give the verdict

Your final message is one of these shapes.

```
CLEAN. Scanned: <scope>. No leaks. Intended matches: <list or "none">.
```

```
BLOCKED. Scanned: <scope>.
- <file>:<line> (or <commit>): <category>, <what it is, without repeating a secret's value>
Fix: <proposed fix for each>. Then run /publish-check again.
```

```
INCOMPLETE. Scanned: <scope>. Not checked: <what, and why>.
```

Proposed fixes, by where the leak is:

- **Only in the current tree:** fix the file in a new commit.
- **In an unpushed commit's diff, message or author email:** those commits must be rewritten before pushing; a new commit does not remove them. Amend if it is `HEAD`; otherwise `git reset --soft <remote>/<branch>` and recommit, or the user rewrites with an interactive rebase. For a wrong author email, set `git config user.email` (for example to the host's noreply address), then `git commit --amend --reset-author`.
- **In pushed or deep history:** rewriting is the user's decision. Options: rewrite with `git filter-repo`, or publish a fresh repository without the old history. Rewriting does not reach existing forks or clones.
- **A secret pushed anywhere, ever:** rotate it first, whatever happens to the history.

## Red flags

| Thought | Reality |
|---|---|
| "I deleted the file, so it's fine" | It is still in the history. Scan the history. |
| "The repo is private for now" | The check is for the moment it becomes public. Scan the whole history then. |
| "That's just my username in a path" | It is a personal identifier. Leak. |
| "I'll show the key so the user can find it" | Name the file and line. Never repeat a secret. |
| "The user is pushing now, skip it" | A push-range scan takes seconds. Never say CLEAN for a shortened scan; say INCOMPLETE and name what was skipped. |
