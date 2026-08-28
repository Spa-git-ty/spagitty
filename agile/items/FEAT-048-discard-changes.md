<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-048 — Discard changes

**Status:** Done on `feature/FEAT-048-discard-changes`.
**Screen:** Commit / working copy (1C).
**Requested by:** the gap analysis
[`docs/analysis/gitkraken-gap.md`](../../docs/analysis/gitkraken-gap.md),
2026-08-24, as the one deliberate omission that should not have been one.

## Why this identifier

FEAT-047 was the last one handed out. This is the next.

## Problem

Nothing in Spagitty could throw a change away. `work.rs` said so at the top and
meant it as a safety property: every operation moved something between the
working tree and the index or turned the index into a commit, so a mistake cost
an unstage and never work.

The cost of that property is paid every day. Discarding a change is one of the
most common operations in a working day, and a client that cannot do it sends
the user to the terminal to do it — where they type `git checkout --` or
`git restore` with no confirmation at all, which is strictly worse than the
thing being avoided. The screen also invited the action: Working copy showed a
list of changes and offered only ways to keep them.

## Wanted

- **Discard one file** from the unstaged column.
- **Discard all** unstaged changes, from that column's header.
- **Discard one hunk** of the open file.
- Each behind a confirmation that says what will happen to *these* paths — in
  particular that an untracked file is deleted rather than reverted, because
  those are different events under one word.
- Each recorded in the command log like every other write.

## Non-scope

- **The staged column.** `git restore --worktree` is defined against the index,
  so "discard" on the staged side would mean discarding the staged decision as
  well — a different and larger operation. A staged change is one unstage away
  from being discardable, and that path is reversible.
- **`git clean -x`.** An ignored file is one this screen never showed. Deleting
  it would be a surprise the operation cannot afford.
- **An undo.** There is no reflog for the working tree. The confirmation is the
  whole mechanism, which is why the wording is asserted rather than eyeballed.
- Discarding from the Graph, the Diff screen, or a stash entry.

## Acceptance criteria

- A modified file goes back to what is staged for it; an untracked file is
  deleted; a deleted file comes back.
- A file staged in part keeps its staged part.
- An ignored file is never touched.
- Discarding one hunk leaves the rest of the file and the whole index alone.
- A hunk whose file changed under the screen is refused, not half-applied.
- Nothing is discarded without a confirmation that names what will happen.

## Dependencies

FEAT-003's working copy, and the hunk patch machinery FEAT-003 built for
staging — `diff::working_hunk_patch` is the same call, applied to the working
tree instead of the index.
