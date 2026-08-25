<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# Roadmap

The order the outstanding work is meant to be taken in, and why each piece sits
where it does. This is a reading of the index in [README.md](README.md) against
the gap analysis in [../docs/analysis/gitkraken-gap.md](../docs/analysis/gitkraken-gap.md);
the index stays the authority on what exists and what state it is in.

Every entry below now has an identifier. The four that came out of the gap
analysis rather than out of a request were named as they were started —
FEAT-048, FEAT-049, FEAT-050 and FEAT-051 — because the record test refuses a
cited identifier that resolves to nothing, so naming them earlier would have
broken the suite for no gain.

Sizes are the author's working estimate for someone who already knows the tree,
and they assume the existing test conventions are followed.

## Now

### 1. FEAT-047 — the branches table: resizable columns, and a divergence worth reading

**Done**, on `feature/FEAT-047-branch-table`. Finishing it clears the only open branch and
leaves the Branches screen ready for the delete and rename work that follows.

**Closed by:** a per-repository column store with its own storage prefix, and a
two-sided divergence bar scaled against the widest drift on screen.

### 2. FEAT-048 — discard changes

**Done**, on `feature/FEAT-048-discard-changes`.

The largest hole in daily use, and the cheapest to fill. Working copy can
stage, unstage and commit; nothing there can throw a change away, so the most
common mistake in a working day sends the user to the terminal. The gap
analysis names it as the one deliberate omission that should not have been one.

**Closed by:** discard file, discard hunk and discard all on the unstaged side,
each behind a confirmation whose wording says whether the file is reverted or
deleted. The staged side is deliberately untouched.

### 3. FEAT-013 — branch delete and rename

**Done**, on `feature/FEAT-013-branch-delete-rename`.

**Closed by:** row-level delete and rename, a bulk merged cleanup that shows
every name before it runs, and a confirmation that carries the actual command
to bring an unmerged branch back rather than pointing vaguely at the reflog.

### 4. FEAT-015 — rebase execution

**Done**, on `feature/FEAT-015-rebase-execution`.

**Closed by:** a worker that runs the rebase without holding the session lock,
progress read from git's own state counters rather than parsed from its output,
and a stopped state that hands off to Conflicts with continue, skip and abort
beside it.

### 5. FEAT-016 — conflict resolution writes

**Done**, on `feature/FEAT-016-conflict-writes`.

**Closed by:** three ways out of a file — a whole side, one marker region, or
text typed into the merged pane — each followed by an explicit `git add`, plus
Continue and an Abort that says what comes back for the operation it is aborting.
The conflicted stash apply recovery flow is still parked; it was not in scope.

## Next

### 6. FEAT-049 — remotes management

**Done**, on `feature/FEAT-049-remotes`.

**Closed by:** a Settings → Remotes section that adds, renames, removes and
retargets, each through `git remote` rather than a config edit. The `-u`
question was answered: push had no `--set-upstream`, so every new branch was
left unmapped and FEAT-047's divergence bar had nothing to read. Fixed.

### 7. FEAT-050 — reflog view

**Done**, on `feature/FEAT-050-reflog`.

**Closed by:** a Reflog screen at rail entry 1L, reading HEAD or any local
branch, with three ways out of an entry — branch here, check out here, reset
here — offered in that order because only the first cannot cost anything.

### 8. FEAT-051 — tags list

**Done**, on `feature/FEAT-051-tags`.

**Closed by:** a Tags screen at rail entry 1N with create, delete, message
rewriting and checkout, and annotated told apart from lightweight throughout —
the difference decides whether a message can exist at all.

### 9. FEAT-018 — finish fetch and push

**Done**, on `feature/FEAT-018-finish-fetch-push`.

**Closed by:** pruning as a setting rather than something that always happened,
progress streamed from a worker, per-remote fetch behind a right-click, and a
Branches header that says how old its drift numbers are. The upstream on first
push had already been fixed in FEAT-049.

### 10. FEAT-033 — branch divergence on the chip

Backlog. Naturally follows FEAT-047, which builds the divergence reading the
chip would reuse.

**Depends on:** FEAT-047.
**Size:** half a day.

## Later

### 11. FEAT-017 — forge integration

The largest remaining distance from GitKraken and the only entry here that
needs a subsystem decision first: the project links no HTTP client in either
language, and a test keeps it that way. Accounts, OAuth and token storage come
before anything visible. Pull requests, issues, CI status on the graph and
clone-from-host all sit behind it; only the account and PR core is scoped by
the item, and the rest has no item yet.

**Decide first:** which language owns the HTTP client, and what the test that
currently forbids one becomes.
**Size:** weeks, not days.

### 12. FEAT-019 — commit signing

The "Sign my commits" toggle persists and nothing reads it. Needs GPG and SSH
signing with passphrase prompts, which is the first thing in the app that has
to ask for a secret.

### 13. FEAT-034 — browse a stash entry file by file

Backlog. The detail panel shows the diff; per-file browsing does not exist.

### 14. TASK-003 — make the Tauri layer generic over `Runtime`

Backlog, and the only entry that buys nothing a user can see. It buys tests
against the command layer without a window.

### 15. The long tail

None of these have items, and none should get one until somebody asks:
submodules UI, Git LFS awareness, worktree detection and add/remove, image and
binary diffs, syntax highlighting in diffs, diff-content search (`-G`-style),
a first-class file history and blame view, external diff and merge tool
configuration, and profiles that switch identity and keys as a set.

## Deliberately not on this list

Recorded so they do not resurface as gaps: dragging commits onto branches,
inline commit-message editing on the graph, manual lane layout and independent
graph zoom, all in `docs/reference/gitkraken-commit-graph.md`; and
workspace/cloud sync, which is out of character for an offline-first client.
