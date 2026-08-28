<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-016 — The graph's columns stop at the last commit row

**Status:** Fixed, awaiting sweep
**Branch:** `bugfix/BUG-016-graph-columns-stop-at-the-last-row`
**Screen:** Graph

## Problem

On a repository with fewer commits than the window is tall, the graph's columns
end where the commits end. The band the lanes are drawn on, and the vertical
rule down each side of it, stop at the last row and leave a blank slab between
there and the status strip.

The header above that slab still shows three columns, so the table reads as
though it has been cut off halfway down rather than as a table with nothing more
to show. It is worst on exactly the repositories where it is most visible: a
freshly cloned or freshly initialised one, which is often the first thing a new
user opens.

The cause is that the band is painted by the row rather than by the table.
`.lane-space` is a cell inside `.row` in `src/lib/graph/CommitRows.svelte`, and
it carries the `--graph-bg` fill along with an inset rule on each edge. Rows
exist only where commits exist, so the columns exist only where commits exist.
Nothing else in the table draws a vertical rule — the dividers visible in the
header are the `.divider` resize handles in `GraphHeader.svelte`, which belong
to the header and end with it.

## Reproduction

1. Open a repository with a handful of commits — five is plenty — in a window
   tall enough to show more rows than the repository has.
2. Look at the area below the last commit row.

**Observed:** the graph band and both vertical rules end at the last row; below
it the area is flat, with no column structure at all.
**Expected:** the columns carry on to the bottom of the table, with no rows in
them.

**Environment:** reproduced on Linux/Wayland, WebKitGTK, at a window of
1701x1381. Nothing about it is platform-specific — it is a layout fault and is
present wherever the Graph screen renders.

## Scope

- The graph band and its two rules continue for the full height of the
  scroller, whether or not there are commits under them.
- The band's paint is declared once, so the part under the rows and the part
  under nothing cannot come out different colours.
- Whatever moves a column — a resize, a reorder, hiding one — moves the
  continued band with it, exactly as it moves the rows and the lane canvas.

## Non-scope

- The alternating row stripe does not continue past the last commit. The author
  asked for the columns "with no rows", and a stripe with no row in it is a row
  that is not there.
- `src/lib/branches/BranchTable.svelte` is built the same way and may have the
  same fault. It is a different screen and a different table; if it matters it
  is its own item.

## Acceptance criteria

- With a repository shorter than the window, the band and both rules reach the
  bottom of the table.
- With no commits at all, the columns are still drawn.
- Resizing or reordering a column moves the continued band with the rows.
- Row hover, stripe and selection are unchanged where rows exist.

## Dependencies

None.
