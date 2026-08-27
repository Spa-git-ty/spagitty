<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-015 — Plan

**Item:** [`agile/items/FEAT-015-rebase-execution.md`](../items/FEAT-015-rebase-execution.md)
**Branch:** `feature/FEAT-015-rebase-execution`
**Status:** implemented.

**Branch point.** Cut from `feature/FEAT-013-branch-delete-rename`, continuing
the unmerged stack.

## Approach

`shell::rebase_interactive` was already written and already correct — the
sequence-editor trick, the accept-as-is message editor, git owning its own state
directory. What was missing was everything around it.

### A worker, because of the lock

Every write command holds the session lock while it runs. That is fine for a
commit and wrong for a rebase: replaying a hundred commits takes long enough
that the screen showing progress could not ask for it, because the command
answering that question wants the same lock.

So `rebase_run` takes the working directory and the git directory while it holds
the lock, gives the lock back, and hands both to a thread. Everything after that
arrives as `rebase-progress` and `rebase-done`.

**Nothing cancels the worker.** A rebase stopped by a signal leaves state that
only `git rebase --abort` knows how to unwind, so stopping a rebase is a git
command rather than a kill. The worker has no `cancel` for that reason, and
`Drop` waits rather than stopping.

### Progress is read, not parsed

git prints `Rebasing (3/7)`, and that string is localised and has changed
between versions. The same numbers are in `rebase-merge/msgnum` and `end` — a
format other tools already depend on — so `rebase::progress` reads those and the
worker polls it every 80ms while it would otherwise be blocked on `wait()`.

Reading the state directory also answers the question the exit code cannot. git
exits non-zero both for *I stopped, your turn* and for *this did not work*, and
only the presence of that directory afterwards tells them apart. `stopped` is
computed that way and is not a failure: it is the hand-off.

`rebase-apply/` is read as well as `rebase-merge/`, so a rebase started from the
command line while Spagitty was open is legible here too. A state directory with
no counters in it yet reads as *no progress*, not as step 0 of 0, which would
flash a bar at zero.

### The screen has three shapes

Planning is what it was. **Running** replaces the plan with a step count and a
bar — there is nothing to edit while git is replaying, and a live todo list
would invite the attempt. **Stopped** is a screen about one commit: the
conflicts themselves are elsewhere, and what belongs here is the way onwards —
Resolve conflicts, Continue, skip, abort.

`stopped` is derived from the progress read rather than from the last run's
outcome, so a rebase left unfinished by a previous session — or started from a
terminal — is the screen's state on arrival rather than something it only learns
after running one itself.

The listener is attached by the layout, not the screen. People leave the Rebase
screen for Conflicts while it is still running, and its progress must not stop
being heard when they do.

### The confirmation names four things

The item asked for the branch, the commit count and the reflog window; the
fourth is dropped commits, which are not replaced by anything and are a
different loss from being replaced by a commit with a new id.

Abort gets its own question, and it says the part nobody expects: `--abort` is
safe for the rebase and throws away every conflict resolved since it stopped.

## What was not done

- **The `edit` action's own stop.** git stops for `edit` the same way it stops
  for a conflict and the screen handles it identically, but there is no
  amend-here affordance — that is the Commit screen, one route away.
- **Undo after a successful rebase.** The item names `git reset --hard
  ORIG_HEAD`; `ORIG_HEAD` is read and shown while a rebase is stopped, but the
  button is not built. It is `reset --hard` with a different name on it, the
  graph already offers that, and offering a second, softer-looking route to the
  same destructive operation is how people reach it by accident.
- **A second concurrent rebase**, refused rather than queued.
