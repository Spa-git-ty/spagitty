<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-016 — Plan

**Item:** [`agile/items/TASK-016-one-branch-carried-fifteen-items.md`](../items/TASK-016-one-branch-carried-fifteen-items.md)
**Branch:** `task/TASK-016-branch-split`
**Base:** `356142f`, approved with the plan.

## Approach

Record, do not rewrite.

The obvious reading of "split the branch" is to rebuild it: cut twenty-eight
branches from a common base and replay each item's commits onto its own. That
was considered and rejected, and the reasoning is the substance of this plan.

### Why the stack is not rebuilt

- **It is forty-five chances to lose work.** Every replayed commit is a conflict
  resolution done by whoever runs it, on code they may not have written, to
  produce a history of work that is already finished and already correct.
- **The commits are not separable anyway.** Three of them carry two items each,
  and one carries two of which the second is cited only in a source comment.
  Separating those means splitting individual commits by hunk — authoring new
  commits that never existed and attributing them to the original author.
- **It buys nothing that the record does not.** What was lost when the items
  rode along is the join between an item and its code. A table restores that.
  What a rebuild would additionally buy is the ability to merge them
  independently, and nobody wants to: they are sequential, they build on each
  other, and they are going into `dev` as one history.
- **Amendment 6 covers it by intent.** Destructive git operations are named
  there as deletion by another route, and a mass rebase of unmerged authored
  work is exactly the shape of thing that amendment exists to stop.

### What is done instead

1. **The mapping table**, built by reading every commit subject on the stack
   against the index, and by reading the diffs of the four that name no item.
2. **The gap named**: four commits with no item at all, so that a later reader
   finds a recorded hole rather than assuming the table is complete.
3. **The rule demonstrated rather than asserted.** The six branches cut in this
   session each carry one item and none stacks on another. A rule that is only
   written down is a rule that will be broken again in the same way.

### Why branch markers were not created either

A branch or tag per item, pointing into the middle of a linear stack, resolves
the name but lies about the shape: `FEAT-050` would "contain" the forge, the
signing work and everything before it. A bookmark that suggests independence
where there is none is worse than a table that says plainly what happened.

Amendment 13's prefixes are also a closed set — `feature/`, `task/`, `chore/`,
`bugfix/`, `hotfix/`, `release/` — and a marker namespace would be an invented
seventh.

## Files

`agile/items/TASK-016-one-branch-carried-fifteen-items.md` and its three
companions. No source file changes; no ref is created, moved or deleted.

## Testing

`tools/record.test.ts`, which is the check that matters for a record item: every
identifier cited in the table has to resolve to a real item document, and the
index has to agree with the tree.

The table's own accuracy is checked by the sweep, one ticket per class of claim,
because a table of thirty commit ids is exactly the kind of thing that is
plausible and wrong.

## Risk

The risk is a wrong row: an item pointed at a commit that is not where it landed
would be worse than no table, because it would be believed. Every row was read
off `git log` on the branch rather than from memory of what happened, and the
sweep re-derives a sample of them independently.

## Rollback

Revert the commit. The table goes away and the stack is exactly as it was —
which is the point of doing it this way rather than by rebasing.
