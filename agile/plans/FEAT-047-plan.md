<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-047 — Plan

**Item:** [`agile/items/FEAT-047-branch-table-columns-and-divergence.md`](../items/FEAT-047-branch-table-columns-and-divergence.md)
**Branch:** `feature/FEAT-047-branch-table`
**Status:** implemented.

**Branch point.** Cut from `task/rename-to-spagitty`, continuing the unmerged
stack. The item's own first commit — extracting the column store — is already in
that history, and the branch it named (`feature/FEAT-047-branch-table-columns`)
points at that commit's parent generation; it was left where it is rather than
moved. The deviation from Amendment 13 is the same one the rest of the stack
carries.

## Approach

Two halves, and they only meet in `BranchTable.svelte`.

### The columns

`$lib/ui/columns.svelte` already does all of it — order, per-column widths with
minimums, one column that fills, `localStorage` keyed by repository. It was
extracted from the graph for exactly this. So the branches table gets its own
thin store, `$lib/branches/columns.svelte`, which supplies four columns, a
default order and a storage prefix of its own, and nothing else.

The prefix matters more than it looks: `spagitty.branches.columns:` against the
graph's `spagitty.graph.columns:`. One prefix for both would mean a width chosen
on one screen arriving on the other, keyed by the same repository path.

Every column is marked `required`. The item puts hiding and reordering out of
scope, and a four-column table where one column is the branch name and one is
the actions has nothing worth hiding; `required` is what makes a stored layout
from some future version that dropped one get repaired rather than rendered.

Widths carry over from the grid this replaces — `220px`, `210px` — so nobody's
table moves on the first paint after the upgrade. The drift column is the one
exception: 90px was the cell the author called awful, and the bar needs room, so
150 is the width and 90 stays as the minimum.

**The grid becomes a flex row.** `grid-template-columns` cannot express "this
one fills and the rest are what the store says" without rebuilding the template
string on every change, and the graph already answered this with flex plus a
per-cell width. The header and the rows use the same `sizing()` so they cannot
disagree.

**The divider sizes the column it sits on.** Not the one after it. The reasoning
is written out at length in `GraphHeader.svelte` and is not repeated here; the
handler is the same shape, including measuring the start width from the DOM
rather than from the store so that dragging the filling column does not snap it
to its minimum first.

### The divergence bar

The arithmetic goes in `$lib/branches/divergence.ts`, not in the component, for
two reasons: the four states can then be asserted without mounting anything, and
there is one place that turns a pair of counts into two widths, so the bar and
the store cannot disagree about what the counts are.

```
no upstream   no upstream          (no bar at all — not a dash, not an empty bar)
level         ▏                    (the tick alone, accented)
ahead         ▏████                 
behind    ████▏
both      ██▏███
```

Three decisions worth writing down:

1. **The scale is per screen, not per row.** Every bar is scaled against
   `widest()` — the largest single-sided count on screen. A per-row scale would
   draw one commit and two hundred identically, which is the failure the bar
   exists to fix.
2. **A sliver floor of 12%.** One commit against a maximum of four hundred is a
   quarter of a percent, which paints as nothing and reads as level. The floor
   keeps "one commit" and "no commits" different at a glance. Zero is still
   zero: the floor applies to a count that exists, not to an empty side.
3. **Level draws a bar.** The tick is the branch's own position and is always
   present, so an empty cell cannot be confused with "not loaded".

Each half is its own flex track with its own justification, so a segment grows
outward from the centre line. Growing inward from the cell edges would put the
longest bars furthest from the line they are measured against.

The counts stay beside the bar as `behind/ahead`, and the sentence stays in
`title` and in `aria-label`. Nothing here is glyph-only.

### Where the store is pointed at a repository

`columns.open()` is called from the Branches route's existing repository effect,
next to `branches.clear()` — before the table paints rather than after.

## What was not done

- The graph's columns are untouched. The item makes that a criterion, and the
  only shared file, `$lib/ui/columns.svelte`, was not edited.
- No sorting, no hiding, no reordering on this table. Resizing is what was
  asked for.
- The backend counts are untouched. They were already built and tested.
