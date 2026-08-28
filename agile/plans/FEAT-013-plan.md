<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-013 — Plan

**Item:** [`agile/items/FEAT-013-branch-destructive-operations.md`](../items/FEAT-013-branch-destructive-operations.md)
**Branch:** `feature/FEAT-013-branch-delete-rename`
**Status:** implemented.

**Branch point.** Cut from `feature/FEAT-048-discard-changes`, continuing the
unmerged stack. FEAT-048 added `Chip`'s `danger` variant, which the Delete
control on this screen uses, so the stack is logical here as well as positional.

## Approach

The core was already done and reachable from the graph. What was missing was
the Branches screen's own controls, the bulk cleanup, and — the part the item
flagged and the graph never had — a recovery instruction someone could act on.

### The sentence people will need

The graph said an unmerged branch's commits would be "reachable only through
the reflog, until git expires them" and stopped. That is true and useless: it
assumes a reader who already knows how to use the reflog, and a reader who knows
that did not need the warning.

`deleteBody` now ends with the command. With a short id in hand — the Branches
screen has one, on every row — it is `git branch <name> <id>`, which is the
whole recovery. Without one it names `git reflog` first, because finding the id
is the part nobody remembers.

The graph's `deleteBranch` imports the same function. Two places delete a branch
and they must not come to say different things about what it costs.

### Controls that explain themselves rather than vanishing

Three rows cannot be deleted from this screen: the branch you are standing on,
a remote-tracking ref, and — implicitly — anything while a write is in flight.
`undeletable()` answers which and why, and the row renders a **label** in place
of the button carrying that reason in its title.

A control that disappears is worse than one that refuses. The reader is left
wondering whether they misremembered where it was; the label tells them.

### The bulk cleanup shows the list

`deleteMerged` puts every name in the dialog body, one per line, rather than
"Delete 14 branches". This is the one operation on the screen that touches refs
the user did not individually point at, and a number is a thing people agree to
where a list of names is a thing people read.

It **never forces**. The list is a moment old; a branch that stopped being
merged between the walk and the click must fail rather than be forced through,
which is the difference between a cleanup and an accident.

`deleteMany` runs them **sequentially**. `git branch -d` takes a lock, and the
first failure stops the run: carrying on past one would leave the user reading
a list of things that did not happen for reasons they never saw.

### `Chip` grows two props

`danger`, to paint the unmerged Delete as destructive, and `disabled`, so a chip
that acts goes dead while a write is in flight the same way `Btn` does. Without
the second, the one control that deletes things stayed pressable twice — which
the existing "disables the actions while a write is in flight" test caught the
moment Delete became a button.

## What was not done

- **Deleting a remote branch.** `git push --delete` is a network operation and
  belongs with FEAT-018's remaining work, not here.
- **Undo.** The reflog is the recovery path and the dialog now names it. A
  stash-and-restore layer of our own would be a second, worse reflog.
- Renaming a remote-tracking ref, which is not a thing.
