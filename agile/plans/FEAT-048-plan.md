<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-048 — Plan

**Item:** [`agile/items/FEAT-048-discard-changes.md`](../items/FEAT-048-discard-changes.md)
**Branch:** `feature/FEAT-048-discard-changes`
**Status:** implemented.

**Branch point.** Cut from `feature/FEAT-047-branch-table`, continuing the
unmerged stack. Nothing here touches the Branches screen; the stack is
positional, not logical.

## Approach

Four layers, and the interesting decisions are all about scope — what discard
is *not* allowed to touch.

### `shell.rs`: three primitives

- `discard` — `git restore --worktree -- <paths>`. **Not `--staged`.** That one
  flag is the difference between "throw away the change you have not kept" and
  "throw away the decision you already made". A file staged in part keeps its
  staged part, which is exactly what the Unstaged column is showing.
- `remove_untracked` — `git clean -f -d -q -- <paths>`. `git clean` rather than
  removing files directly, so the same rules the user's own `git clean` follows
  apply. **No `-x`**: an ignored file is one the screen never showed.
- `apply_to_worktree` — `apply_to_index` with `--cached` taken off, so the patch
  lands on the file and nothing else.

### `work.rs`: the classification

`discard(repo, paths)` splits the paths into tracked and untracked **by reading
the status**, not by trusting the caller. The screen knows which column a row
came from, but a row can be stale, and naming a file `git restore` does not
track fails the whole call rather than that one path. Restore runs first: if the
clean then fails, the tracked half has still happened and the error names what
is left.

`discard_hunk` is `stage_hunk` with the other target. The staleness check it
inherits matters more here than it does for staging — staging the wrong hunk
costs an unstage, discarding the wrong one costs the work.

The module header changes with it. It used to say that nothing here discards a
change and treat that as a property; it now says which two functions are the
exception, what guards them, and why the original reasoning was wrong.

### `discard.ts`: the question

The confirmation is a module of its own rather than three call sites, because
the sentence depends on what the paths are. "Discard" means two different things
— a tracked file is reverted, an untracked one is deleted — and only one of them
leaves a file behind. `discardBody` composes the sentence from the counts of
each, and always ends with "This cannot be undone."

The store does not ask. A store that asked as well would ask twice, and the
tests that drive the store would need a dialog on screen to do it.

### The controls

- Unstaged rows get `✕` beside `+`; the title says which of the two things it
  is about to do to that path.
- The unstaged header gets **Discard all** beside **Stage all**.
- The hunk pane gets a **discard hunk** chip beside **stage hunk**, on the
  unstaged side only.

`Chip` gains a `danger` variant for it. Both destructive controls are red **on
hover only** — a column of red crosses reads as a list of errors rather than as
a column of available actions.

## What was not done

- Nothing on the staged side. Reasoned in the item's non-scope.
- No undo, and no attempt at one. A stash-before-discard would turn one
  destructive operation into a silent stack of stashes nobody asked for.
