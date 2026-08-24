<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# Roadmap

The order the outstanding work is meant to be taken in, and why each piece sits
where it does. This is a reading of the index in [README.md](README.md) against
the gap analysis in [../docs/analysis/gitkraken-gap.md](../docs/analysis/gitkraken-gap.md);
the index stays the authority on what exists and what state it is in.

Four entries below have no identifier yet. They came out of the gap analysis
rather than out of a request, and an identifier is assigned when the work
starts — the record test refuses a cited identifier that resolves to nothing,
so naming them early would break the suite for no gain.

Sizes are the author's working estimate for someone who already knows the tree,
and they assume the existing test conventions are followed.

## Now

### 1. FEAT-047 — the branches table: resizable columns, and a divergence worth reading

**Done**, on `feature/FEAT-047-branch-table`. Finishing it clears the only open branch and
leaves the Branches screen ready for the delete and rename work that follows.

**Closed by:** a per-repository column store with its own storage prefix, and a
two-sided divergence bar scaled against the widest drift on screen.

### 2. Discard changes — no identifier yet

The largest hole in daily use, and the cheapest to fill. Working copy can
stage, unstage and commit; nothing there can throw a change away, so the most
common mistake in a working day sends the user to the terminal. The gap
analysis names it as the one deliberate omission that should not have been one.

**Closes when:** discard file, discard hunk and discard all exist on Working
copy, each behind a confirmation, each recorded in the command log like every
other write.
**Depends on:** nothing.
**Size:** a day, most of it the confirmation and the log entries rather than
the git work.

### 3. FEAT-013 — branch delete and rename

`ops::delete_branch` and `ops::rename_branch` are built and reachable from the
graph's context menu. The Branches screen's own delete and rename, and the bulk
merged-branch cleanup, are not. Sits behind FEAT-047 because both edit the same
screen and would collide.

**Closes when:** the Branches screen deletes and renames a branch, refuses an
unmerged delete without an explicit override, and offers the merged-branch
cleanup as one action.
**Depends on:** FEAT-047.
**Size:** a day. No plan document yet; one is written when it starts.

### 4. FEAT-015 — rebase execution

`ops::rebase_interactive` and the `rebase_run` command are built. The frontend
is unwired: Apply is a hardcoded `disabled`, and there is no progress or abort
path. This is the first half of the merge story and the natural pair to the
conflict work below.

**Closes when:** a rebase runs from the app with visible progress, hands off to
the conflict screen when it stops, and can be aborted from either place.
**Depends on:** nothing built; pairs with FEAT-016.
**Size:** two to three days. No plan document yet.

### 5. FEAT-016 — conflict resolution writes

The single biggest functional gap. Ours, theirs and base render read-only;
take-ours, take-theirs, edit, mark-resolved and abort are all disabled. Until
this lands, every conflict — including one a rebase or a stash apply causes —
ends in the terminal, which also parks the designed recovery flow for a
conflicted stash apply.

**Closes when:** a conflicted file can be resolved per file and per hunk from
the app, edited inline, marked resolved, and the whole operation abandoned.
**Depends on:** nothing, but FEAT-015 makes it reachable more often.
**Size:** three to four days. The inline editor is most of it.

## Next

### 6. Remotes management — no identifier yet

Fetch, push and pull work against remotes that already exist. Adding, renaming
or removing one requires the terminal. Verify at the same time whether first
push uses `-u`; if it does not, every new branch is left unmapped and the
divergence work in FEAT-047 has nothing to read.

**Closes when:** remotes can be added, renamed and removed from Settings or the
Branches screen, and a first push sets upstream.
**Size:** a day, mostly screen.

### 7. Reflog view — no identifier yet

Absent entirely. It is where recovery starts after a history rewrite goes
wrong, which is exactly what FEAT-015 and FEAT-016 make routine. Cheap, and it
raises the ceiling on how destructive the app is allowed to be.

**Closes when:** a reflog screen lists entries with their operation, message
and date, and can check out or reset to one.
**Depends on:** worth doing after FEAT-015 so it has something to recover from.
**Size:** a day.

### 8. Tags list — no identifier yet

Create and delete exist, but only through the graph's context menu. There is no
gathered view, no annotated-tag message editing, no checkout-from-tag.

**Closes when:** a tags list exists with create, delete, annotate and checkout.
**Size:** half a day to a day.

### 9. FEAT-018 — finish fetch and push

Partial: the buttons are live and the plumbing is complete, but three of the
five things the item scoped were never built. Read the item's **What actually
shipped** section before planning — the problem statement above it describes
the tree as it was before any of it existed.

**Closes when:** the three unbuilt pieces named in the item are built, or the
item is rescoped in writing to drop them.
**Size:** unknown until the item is re-read; assume a day.

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
