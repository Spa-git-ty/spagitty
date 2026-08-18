<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-015 — Rebase execution

**Status:** Partial. `ops::rebase_interactive` and the `rebase_run` command
are built; the frontend is unwired — Apply is a hardcoded `disabled`, and
there is no progress or abort path. Corrected by TASK-012. No plan yet; one
is written when the remainder starts.
**Screen:** Interactive rebase (1E).

## Problem

FEAT-009 plans a rebase and previews its result. Nothing executes it: the Apply
button is disabled and `shell::rebase_interactive` is an `unimplemented!()`
stub.

## Why it was deferred

Rebase rewrites history. It is the one operation in GitLumiere that can leave a
repository in a state the user cannot finish from the UI, and the reason
`shell.rs` exists at all.

## Scope when started

- Handing the planned todo list to `git rebase -i` with a sequence editor that
  writes the plan instead of opening one.
- Surfacing progress commit by commit.
- Stopping cleanly at a conflict and handing over to the Conflicts screen, then
  continuing.
- Abort, and the undo path back to `ORIG_HEAD`.
- The confirmation, which names the branch, the commit count and the reflog
  window.

## Notes for whoever picks this up

- The whole argument in `shell.rs` applies here: the on-disk rebase state is a
  protocol other tools read. Nothing about it is reimplemented.
- `GIT_SEQUENCE_EDITOR` is how the todo list is supplied without a terminal.
- A rebase interrupted by the user closing GitLumiere must leave a repository the
  command line can finish.
- The undo path is `git reset --hard ORIG_HEAD`, which is itself destructive:
  it needs the same treatment as anything else that discards work.

## Dependencies

FEAT-009, FEAT-016 (conflicts during a rebase must be resolvable).
