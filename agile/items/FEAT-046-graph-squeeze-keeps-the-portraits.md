<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-046 — Squeezing the graph column must not shrink the portraits

**Status:** Backlog. No plan yet; one is written when the work starts.
**Screen:** Graph (1A).
**Requested by:** the author, 2026-08-18, with a GitKraken screencast.

## Problem

FEAT-039 made the graph column draggable and the lanes compress into it. Every
pixel dragged also shrinks the author portraits, because the node radius is
derived from the dragged span:

`src/lib/graph/lanes.ts` — `laneNodeRadius(columns, span)`, where `span` is
`laneSpanFor(the dragged width)`.

The reference behaves differently, and the screencast is unambiguous about it:
dragging GitKraken's graph column from wide to a narrow strip leaves the
**avatar diameter identical** at the widest and the narrowest frame. The lanes
fold onto one another and disappear behind the avatars; the nodes end up stacked
at essentially one x, still full size, still fully drawn.

## The two defects

1. **The node follows the dragged width.** FEAT-035's plan argued the node must
   come down with the pitch, or portraits redraw over the lane compression that
   was just achieved. The reference's answer is that the portrait wins: the
   radius should come from the lane *depth* against the design span —
   `laneNodeRadius(needed, LANE_SPAN)` — not against the dragged span. Ordinary
   repositories (≤ 12 lanes) then keep full-size portraits at every column
   width, and the lanes fold behind them. Genuinely deep histories still
   compress, because there the shrink is what makes the graph readable and is
   not something the user asked for by dragging.

2. **A phantom five-lane floor.** `CommitRows.svelte` sets
   `laneCount = max(LANE_COLUMNS_MIN = 5, lanesNeeded(...))`, so a two-lane
   repository is compressed as if five lanes had to fit and the squeeze starts
   long before anything is actually touching. That floor belongs to the column's
   *width* — a column narrower than a few lanes looks broken — not to the
   geometry that decides where lanes go.

## Non-scope

- The compression itself. FEAT-035's pitch floor stays exactly as it is.
- The column's minimum width.
- Anything about how portraits are drawn or cached, beyond the radius they are
  asked for.

## Acceptance criteria

- Dragging the graph column narrower in a repository with a few branches leaves
  the portraits the same size, at every width.
- The lanes still fold, and still stay inside the column.
- A history deeper than the lane cap still shrinks its nodes, as before.
- A two-lane repository is not compressed as though it had five.
- Node and lane still line up exactly, at every width and zoom.

## Dependencies

FEAT-035 and FEAT-039, whose decision this reverses in the case the user caused.
