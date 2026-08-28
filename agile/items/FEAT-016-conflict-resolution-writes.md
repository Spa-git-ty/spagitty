<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-016 — Conflict resolution writes

**Status:** Done on `feature/FEAT-016-conflict-writes`.
**Screen:** Conflicts (1D).

## Problem

FEAT-008 shows ours, theirs and the merged result but writes nothing: take
ours, take theirs, editing the merged pane, marking a file resolved and
aborting the merge are all disabled.

## Why it was deferred

Every one of them overwrites the working copy, and abort discards the merge
entirely. Resolution is also the operation where a wrong click is hardest to
notice, because the result looks plausible either way.

## Scope when started

- Take ours, take theirs, per file and per conflict region.
- Editing the merged pane and saving it.
- Marking a file resolved — staging the result.
- Continuing the operation once every file is resolved.
- Aborting, behind a confirmation naming what returns to what.

## Notes for whoever picks this up

- Marking resolved is `git add`; the three index stages disappear when it
  succeeds, which is the only real check that resolution worked.
- Abort differs by operation — merge, rebase, cherry-pick — and the screen
  already reads which one is in progress.
- The pre-merge state is recoverable from `ORIG_HEAD` and the reflog. The
  confirmation should say which one applies.
- An editable pane means unsaved edits exist; leaving the screen with them must
  not silently discard them.

## Dependencies

FEAT-008.
