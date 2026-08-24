<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-047 — Plan

**Item:** [`agile/items/FEAT-047-branch-table-columns-and-divergence.md`](../items/FEAT-047-branch-table-columns-and-divergence.md)
**Branch:** `feature/FEAT-047-branch-table-columns`
**Status:** in progress — step 1 of 3 done.

**Branch point.** Cut from `feature/FEAT-046-portraits-keep-size`, continuing
the unmerged stack rather than from `dev`, as the rest of the stack does.

## Step 1 — the guard, then the extraction *(done)*

BUG-003 was the lane canvas being placed from a constant while the columns moved
underneath it. The fix made `CommitRows` mirror the row — one spacer per column,
the canvas in the graph's slot — and that arrangement is what the extraction
must not disturb. So the guard was written **first**, against the source,
because happy-dom does no layout and there are no real widths to measure.

Then the generic half of `src/lib/graph/columns.svelte.ts` moved to
`src/lib/ui/columns.svelte.ts` as `createColumns({ catalogue, defaultOrder,
storageKey })`. The graph's file is now a thin adapter: its catalogue, its
defaults, and the two things that were always its own — the author filter, and
the Graph column whose width comes from the lanes rather than from a drag.

## Step 2 — the branch table's columns *(not started)*

A second consumer of `createColumns`, catalogue `branch | drift | when |
actions`: `branch` fills, the other three have widths and minimums, and the
storage key is its own so the two tables cannot overwrite each other's layout.
`BranchTable`'s `grid-template-columns` is built from `shown` rather than
written down, and each header cell carries a divider, dragged the way the
graph's are and double-clicked to reset.

Reordering and hiding are deliberately left out: resizing is what request 8
asked for, and a header menu on a four-column table is furniture.

## Step 3 — the divergence bar *(not started)*

`src/lib/branches/Divergence.svelte`. A fixed-width two-sided bar, the branch's
own position at the centre, behind left and ahead right, each segment scaled
against the widest divergence among the rows on screen — so the bar answers
"which of these has drifted most" as well as "has this one drifted". The four
states are the point: absent, a centre tick, one segment, two.

## Risk

The extraction is the risk, and it is BUG-003's. It is mitigated by the guard
test landing before the move, by the graph's own column tests being untouched
and still passing, and by the graph adapter keeping the same public shape, so
every existing caller is unchanged.

## Rollback

Revert the branch. No schema, no persistence format change — the graph's
`localStorage` key and payload are exactly what they were.
