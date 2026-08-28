<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-016 — Plan

**Item:** [`agile/items/FEAT-016-conflict-resolution-writes.md`](../items/FEAT-016-conflict-resolution-writes.md)
**Branch:** `feature/FEAT-016-conflict-writes`
**Status:** implemented.

**Branch point.** Cut from `feature/FEAT-015-rebase-execution`, continuing the
unmerged stack — and logically as well: FEAT-015 hands a stopped rebase to this
screen, and until this item there was nothing here to hand it to.

## Approach

There are exactly three ways a file leaves this screen, and they all end in the
same place: the file on disk, followed by an explicit `git add`.

### The three ways

1. **A whole side** — `git checkout --ours` / `--theirs`. A git call rather than
   us writing the blob, because it reads the index's stage 2 or 3 and git's
   answer is the one the rest of the ecosystem will see.
2. **One marker region** — parsed out of the file, replaced, written back.
3. **Text typed into the merged pane** — written exactly as given.

### Marker parsing is a format, not a guess

`conflicts::regions` reads what git wrote, strictly: open, optional base, split,
close, each at the start of its own line. Anything else — a `<<<<<<<` inside a
string literal, a half-edited file — is not a region, and a file with an
unterminated one gives up rather than guessing where it was meant to end. The
failure mode of guessing here is silently keeping the wrong half of somebody's
work, which is exactly the thing the item said was hardest to notice.

Two details that would otherwise be wrong quietly:

- **An empty side is an empty string, not a newline.** "Contributed nothing" and
  "contributed a blank line" are different, and only one is right when a side
  deleted the lines.
- **Resolving all regions works back to front**, so each replacement's line
  numbers are still the ones `regions` reported.

### Nothing marks a file resolved on the user's behalf

Taking a side writes the working file and leaves all three stages in the index.
`git add` is separate and deliberate. That is not caution for its own sake: the
stages collapsing is the only real check that resolution worked, and doing it
automatically skips the moment where a person looks at the result — which is
what the screen is *for*.

It also makes the whole screen forgiving. Taking the wrong side costs one more
click, so the only two things worth a dialog are abort and losing an edit.

### The draft

The merged pane is a textarea while it is being edited. Not a line-numbered
editor: this is the escape hatch for the conflict the buttons cannot express,
and what it has to be is exactly what will be on disk afterwards.

The item named the hazard — *leaving the screen with unsaved edits must not
silently discard them* — so:

- `select` **refuses** to move off a dirty draft. `force` is how the caller says
  the user has answered.
- Every move on the screen goes through `$lib/conflicts/actions`, never straight
  to the store.
- A plain **Refresh** keeps the draft. Re-reading the sides underneath an edit
  would replace the text somebody is typing with what is on disk, and a refresh
  button must not be a way to lose work.
- `resolveRegion` **saves a dirty draft first**. The region indexes on screen
  belong to the text on screen; resolving against a different file would take
  the wrong lines.

### Abort says what comes back

Written per operation, because the answers genuinely differ. A merge touches
nothing already committed; a rebase goes to `ORIG_HEAD` and loses every
resolution since; a cherry-pick or revert **keeps the commits it already made**,
which is the one people get wrong — "abort" sounds like "undo all of it".

Continue asks nothing. git refuses it while anything is conflicted and says so
in its own words, which beats a dialog guessing at one. The button is only live
once the list is empty, because a control that cannot work for most of the time
it is visible reads as broken rather than as guarded.

## What was not done

- **A three-way merge editor with per-region gutters in the pane itself.** The
  regions are listed in a bar above the panes instead. It is less pretty and it
  works at any pane width, and the pane stays what it is good at — showing
  exactly what is on disk.
- **Resolving a delete/modify conflict by choosing "keep deleted".** Take ours
  or take theirs covers it, but the wording does not name the deletion.
- **Continuing an `am` or a `bisect`**, refused by name in `resumable`.
