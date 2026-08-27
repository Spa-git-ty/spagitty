<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-016 — Plan

**Item:** [`agile/items/BUG-016-graph-columns-stop-at-the-last-row.md`](../items/BUG-016-graph-columns-stop-at-the-last-row.md)

## Approach

Add a third layer over the same columns: a **bed**, laid out once at the full
height of the scroller, under the rows.

The table already has two layers that agree about where a column is, and they
agree because both are built from the same list rather than from a computed x —
that is the lesson BUG-003 left behind. The row iterates `columns.shown`, and so
does `.lane-layer`, which carries the canvas. The bed is the third, built the
same way, so a resize, a reorder or a hidden column moves all three or none.

It paints only where a row does not cover it, which is exactly the empty space
under the last commit.

## Alternatives considered

**Move the band out of the row entirely, onto `.lane-slot` in the canvas
layer.** One layer fewer, and the band would be full height for free. Rejected:
`.lane-layer` sits *over* the rows, so an opaque band there would paint over the
row's hover, stripe and selection tints in the graph column. The selection
gradient runs the full width of a row on purpose.

**Stretch `.sizer` to the viewport height when the commits do not fill it.**
Smaller change, but it makes the scroll arithmetic lie: `.sizer` is
`count x pitch` and several things read that height as the number of rows. A
sizer that is sometimes taller than its rows is a trap for the next reader.

**Paint the band on `.scroller` as a repeating background.** Would need the
column offsets as pixel values, computed by hand, which is the exact arrangement
BUG-003 was caused by and removed.

## Files

- `src/lib/graph/CommitRows.svelte` — the bed's markup and styles; the row's
  graph cell gives up its own paint for a shared class.
- `src/lib/graph/rows.test.ts` — the bed's tests, and a column-store reset in
  the shared `beforeEach`.

## Steps

1. Add `.bed` as the first child of `.rows`, absolutely positioned across it,
   translated by `-scrollLeft` and given `tableWidth` exactly as `.lane-layer`
   already is. One child per shown column: the graph column's carries the band,
   the others are spacers.
2. Factor the band's fill and its two inset rules out of `.lane-space` into a
   `.lane-band` class, and put that class on both the row's graph cell and the
   bed's graph slot.
3. Make the three layers' order explicit rather than implied by document order:
   bed at `z-index: 0`, `.scroller` positioned at `1`, `.lane-layer` at `2`.
   `.edge` already sits above all of them at `4`.
4. Tests for the bed, including the empty-repository case.

## Risks

**The stacking order.** `.bed` is positioned and `.scroller` was not, and a
positioned element paints above the in-flow content of a static sibling — so the
bed would have covered the commits. This is why step 3 is not cosmetic: without
it the fix hides the table it is meant to complete. Guarded by every existing
row test, which reads content that would be behind it.

**Test isolation, discovered while writing the tests.** `columns` is a module
singleton and `rows.test.ts` never reset it, so a width or an order set by one
test was still set in the next. The existing tests passed only because they
happened to be the first to touch it. `columns.reset()` now runs in the shared
`beforeEach`.

## Rollback

One file's markup and styles, plus its tests. Reverting the commit restores the
per-row band exactly.
