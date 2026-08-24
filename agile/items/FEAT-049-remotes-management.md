<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-049 — Remotes management

**Status:** Open on `feature/FEAT-049-remotes`. The core, the commands, the
store and the Settings section are built and the `-u` defect is fixed; the
frontend tests and the plan and testing documents are not written yet.
**Screen:** Settings → Remotes.
**Requested by:** the gap analysis
[`docs/analysis/gitkraken-gap.md`](../../docs/analysis/gitkraken-gap.md),
2026-08-24.

## Why this identifier

FEAT-048 was the last one handed out. This is the next.

## Problem

Fetch, push and pull have worked against existing remotes since FEAT-018.
Adding, renaming or removing one required a terminal, which is a strange gap in
a client whose premise is that the common operations are on screen.

The gap analysis also asked a question this item answers: **does the first push
set upstream?** It did not. `shell::push` built `git push <remote> <refspec>`
with no `-u`, so the first push of a new branch sent the commits and left the
branch tracking nothing — the Branches screen showed no upstream, FEAT-047's
divergence bar had nothing to compare against, and the next plain `push` or
`pull` failed with a message about upstreams that reads as though something is
broken.

## Wanted

- List the configured remotes, with their URLs and whether they have ever been
  fetched.
- Add, rename, remove, and change a URL.
- `--set-upstream` on any push that names a remote.

## Non-scope

- **Pushing a branch deletion** (`git push --delete`), which belongs with
  FEAT-018's remaining work.
- Per-remote fetch refspec editing, and `pushurl` as anything but a read.
- Credentials of any kind: FEAT-017 owns those.

## Acceptance criteria

- The list matches `git remote -v`, in name order.
- Renaming moves the tracking refs and repoints the branches that tracked it.
- Removing takes the tracking refs with it, and says so before it does.
- A first push of a new branch leaves it tracking the remote it went to.

## Dependencies

FEAT-018's fetch and push, and FEAT-036's `Host` for the forge label.
