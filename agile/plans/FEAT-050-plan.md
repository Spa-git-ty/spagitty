<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-050 — Plan

**Item:** [`agile/items/FEAT-050-reflog-view.md`](../items/FEAT-050-reflog-view.md)
**Branch:** `feature/FEAT-050-reflog`
**Status:** implemented.

**Branch point.** Cut from `feature/FEAT-049-remotes`, continuing the unmerged
stack.

## Approach

### Reading is `gix`, in-process

A reflog is an append-only text file per ref under `.git/logs/`, and `gix` parses
it — `Reference::log_iter().rev()` gives the lines newest first, which is the
order both the screen and `@{n}` want. Nothing here shells out, so the whole
module sits on the reading side of the `shell.rs` boundary. Recovering *from* an
entry is a write and goes through the paths that already exist.

### The revision is carried, not derived

`HEAD@{3}` is built in the core and travels with the entry. It could be derived
from the index on the way out, and then two places would know how git numbers a
reflog. Half the value of this screen is knowing what to type somewhere the
screen cannot reach, so the string it shows is the string it means.

### One word for the operation

git writes `rebase (finish): returning to refs/heads/x`. The screen shows
`rebase`, taken from before the colon and before any parenthesis, so
`rebase (pick)` and `rebase (finish)` group as one thing — which is how a reader
thinks of them and what makes the column scannable. A message with no colon
keeps its whole text, and an empty one says `moved` rather than nothing.

### Three states, not two

`exists: false` is separate from an empty list. A repository with
`core.logAllRefUpdates` off keeps no reflog and never will; a ref that has not
moved has nothing *yet*. Collapsing them would tell somebody to wait for entries
that are never coming.

### The order of the recoveries is the argument

Three ways out of an entry, offered in this order deliberately:

1. **Branch here** — a new ref at that commit, nothing else moved. The only one
   that cannot cost anything, and the one FEAT-013's delete warning already
   tells people to type.
2. **Check out here** — detached at that commit. Reversible by checking out a
   branch again.
3. **Reset here** — moves the branch and discards the working tree.

A screen about recovery that led with `reset --hard` would turn one mistake into
two. The reset confirmation carries the sentence that matters: everything it
moves *past* is still in this reflog and reachable from this very screen, and
uncommitted changes were never in any reflog and will not come back.

`resetTo` is always `hard`, never softer. A soft reset would leave the working
tree describing a commit that is no longer checked out, which is not what "go
back to here" means to somebody recovering.

### The filter is local

A substring over operation and message, applied in the store. The list is capped
at 500 entries by the time it arrives; refetching on every keystroke to filter
something already in hand would be a round trip for nothing.

### Where it sits

Rail entry `1L`, after Log. The two answer neighbouring questions — what is in
history, and what was just done to it — and both are about the open repository,
so it goes before the divider.

## What was not done

- **Expiring entries.** `git reflog expire` is maintenance, and it is the one
  reflog command that can make a bad day worse.
- **Selecting a range**, or diffing two entries against each other.
- **`stash@{n}`**, which is a reflog too. The Stash screen owns that view.
