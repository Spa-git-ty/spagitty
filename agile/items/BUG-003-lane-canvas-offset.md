<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-003 — The lane canvas paints over the messages and the branch chips

**Status:** Fixed. Plan in `agile/plans/BUG-003-plan.md`, tests in
`agile/testing/BUG-003-automated.md` and `agile/testing/BUG-003-sweep.md`.
**Screen:** Graph (1A).

## Observed

Commit nodes and lanes are drawn on top of the Commit Message column — the
messages read *behind* the graph — and the branch chips in Branch/Tag are
covered on their right-hand side.

## Expected

The lanes stay inside the Graph column, whatever the other columns are set to.

## Reproduction

At commit `3c24130`:

1. Open any repository on the Graph screen.
2. Drag the divider on the right of **Branch / Tag** to make it narrower than
   its 186px default — the author's screenshot is at roughly 130px.

The canvas stays where it was; the graph now overlaps whatever moved left.
Reordering the columns so Graph is not second, or hiding Branch/Tag from the
header's menu, reproduces it the same way and does not need a drag at all.

## Environment

Any. It is layout arithmetic, identical in the webview and in a browser.

## Cause

`LaneCanvas.svelte` positioned itself with `left: var(--refs-gutter-w)` — the
design constant `REFS_GUTTER_W = 186` from `metrics.ts`. The Branch/Tag column's
real width lives in `columns.svelte.ts`, is user-set, draggable from 90px, and
is stored per repository. Two sources of truth for one number, one of which
cannot change: the canvas was right only in the default layout.

FEAT-023 did not cause it — it made it obvious, by making the thing that lands
in the wrong place a row of faces rather than a thin line.

## Fix

The canvas is no longer positioned by arithmetic at all. `CommitRows` renders a
layer that is the same flex row as a commit row — one spacer per column ahead of
the Graph, with the same widths the cells use, and the canvas in the Graph's
slot — so the browser places it exactly where it places the cells. Whatever
moves a cell moves the canvas with it, and there is no second number to keep in
step.

The slot also clips (`overflow: hidden`), so a canvas that is somehow the wrong
size is cut off at its own column's edge rather than painting over a neighbour.

## Why it was not caught

`rows.test.ts` asserted the reserved cell's width but nothing about where the
canvas sits, and every test ran with the default column widths — the one layout
in which the constant was correct. The tests added with the fix resize and
reorder before asserting.

## Dependencies

FEAT-022 (resizable, reorderable columns), FEAT-023 (which made it visible).
