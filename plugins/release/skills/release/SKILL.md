---
name: release
description: Use when the user asks to release, publish, ship, cut a version, tag a release, or bump the version of something installed by version (a package, plugin, library, CLI or app) - on "/release", "bump the version", "increase the version", "make a new release", "deploy this new version". Not for deploys of unversioned apps. For a leak scan before publishing, use publish-check.
---

# Releasing a Version

## Overview

A release is one version number, written identically in every place the project declares it, with a matching changelog entry, commit and tag. The usual failure is a partial bump: one manifest says the new version, another still says the old one, and installers serve the stale one.

**Announce at start:** "Using the release skill to cut a new version."

## Checklist

Create one todo per step. Complete them in order.

1. Find every version declaration
2. Choose the new version
3. Verify the tree before bumping
4. Write the version everywhere
5. Update the changelog
6. Verify the bump
7. Commit, tag, push, publish

---

## Step 1: Find every version declaration

Read the current version from the main manifest, then search all tracked files for that string. If declarations already disagree with each other, report it and ask which one is current. Typical homes:

| Ecosystem | Files |
|---|---|
| Node | `package.json`; `package-lock.json` (this package's `version` entries, including under `packages`) |
| Python | `pyproject.toml`, `setup.cfg`, `__version__` in the package |
| Rust | `Cargo.toml`, `Cargo.lock` (own crate only) |
| Claude Code plugins | each `.claude-plugin/plugin.json`; in `.claude-plugin/marketplace.json`, `metadata.version` and each plugin entry's `version` |
| Anything | version constants in source, README badges, install snippets that pin a version |

Classify every hit: this project's version (change it), a workspace sibling that pins this package (update its range), or a dependency, a changelog history line, or a coincidence (leave it).

**Several packages or plugins:** if every declaration has the same version and the history shows them bumped together, they are one version: bump them all. Otherwise bump only the packages that changed or that the user named, and ask if unclear.

## Step 2: Choose the new version

If the user named a version, use it, normalized to the project's format (`2.0` becomes `2.0.0` under semantic versioning).

Otherwise judge by everything that will ship: commits since the last release tag (with no tags, since the last commit that changed the version), plus uncommitted changes in `git status`. In a monorepo, limit this to the package's path (`git log -- <path>`).

| Changes include | Bump |
|---|---|
| Anything that breaks existing users: removed or renamed commands, options, files, plugins, APIs; changed install steps | major (minor while below 1.0.0) |
| New features, backwards compatible | minor |
| Only fixes, docs, internals | patch |

State the chosen version and the one-line reason before writing it.

## Step 3: Verify the tree before bumping

Run the project's validation: tests, build, linters, manifest validators (for Claude Code plugins, `claude plugin validate .` and each plugin folder). If anything fails, stop and report it. Do not change code or tests to make a release pass unless the user says so.

## Step 4: Write the version everywhere

Edit every declaration from step 1. Regenerate lock files with the project's own tool when it has one, rather than hand-editing them.

## Step 5: Update the changelog

If the project keeps a changelog (`CHANGELOG.md`, `HISTORY.md`, release notes in the README), add an entry for the new version: date, then what changed for users, grouped as Added / Changed / Fixed / Removed. Breaking changes go first and say what users must do. If the project has no changelog, do not create one unasked; the commit message carries the notes.

## Step 6: Verify the bump

Search again for the old version string. Every remaining hit must be one you chose to leave in step 1. Rerun any validator that reads versions.

## Step 7: Commit, tag, push, publish

Commit the version change with a message naming the version and summarizing the changes. Uncommitted work that belongs in the release goes in first, as its own commit or in the release commit; say which.

If you are not on the default branch, ask before merging, and merge the way the project already does (pull request or fast-forward), never by force-pushing. Tag the commit that lands on the default branch, after the merge.

Tag in the project's existing format (check `git tag`). With no existing tags, ask; suggest `v<version>`, or `<package>@<version>` in a monorepo.

Pushing makes the source public. If the push or publish makes code public and the publish-check skill is available, run it first. Push the commit and tag only when the user asked to release, deploy, publish or push. Otherwise stop after the commit and say what is ready to push.

A registry publish (`npm publish`, `twine upload`, `cargo publish`) or a deploy is a separate step. Run it only when the user asked for it and the project documents how. Otherwise say what to run.

## Red flags

| Thought | Reality |
|---|---|
| "I updated the main manifest, that's the version" | Every declaration counts. Search for the old string. |
| "It's just a version bump, no need to run tests" | The release ships whatever is in the tree. Verify first. |
| "I'll tweak the failing test so the release goes out" | Report the failure. The user decides. |
| "Patch is safest" | The bump tells users what changed. A breaking change in a patch breaks them silently. |
| "I'll fix the changelog after" | The changelog ships with the tag. Write it now. |
