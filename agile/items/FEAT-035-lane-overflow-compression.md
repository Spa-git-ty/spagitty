<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-035 — Lanes past the cap compress instead of stacking

**Status:** Backlog. No plan yet; one is written when the work starts.
**Screen:** Graph (1A).
**Requested by:** the author, 2026-08-18, with a GitKraken screenshot.
**Decision on record:** compress the spacing. Chosen by the author over
collapsing ref chips to `+N`, which is recorded separately as FEAT-036's
neighbour question and is *not* part of this item.

## Problem

Past twelve concurrent lanes, every further lane is drawn at exactly the same
x-position as the twelfth. Lanes 13, 14 and 15 stack on top of one another, and
a node on lane 15 sits precisely where a node on lane 12 does — so the graph
stops being readable at exactly the point a busy history most needs to be.

The author's description was that the graph is "overlapping or hidden under the
comments column". The lanes are not in fact drawn under the message column — the
canvas clips to its own width — they are folded into the last visible column.

## Cause

`src/lib/metrics.ts:226`:

```ts
export function laneX(lane: number, columns: number = LANE_COLUMNS_MIN, zoom = 1): number {
	return (LANE_X0 + Math.min(lane, laneColumns(columns) - 1) * LANE_PITCH) * zoom;
}
```

`laneColumns()` clamps to `LANE_COLUMNS_MAX = 12`, and `Math.min` then clamps the
lane *index* to that same ceiling. `LANE_PITCH` is a constant, so the only way a
wide history can fit is by discarding the distinction between lanes.

The cap itself is deliberate and well argued — `metrics.ts:83-113` records that it
was measured on `cli/cli` (12,896 commits, 3,189 merges) by how many 40-row
viewports draw every lane without clamping. The cap stops the graph eating the
window. What is wrong is only what happens *at* the cap.

## Wanted

The width stays capped; the spacing gives. Within the capped column width, lanes
are spaced at `availableWidth / (needed - 1)` rather than at a fixed
`LANE_PITCH`, so every lane keeps a distinct x and the graph never grows under
the message column.

GitKraken does exactly this, which is the reference the request came with.

## Scope when started

- `laneX` takes the true lane count and derives a pitch, rather than clamping the
  index. The clamp is what goes; the cap on total width stays.
- A floor on the compressed pitch, below which lanes would be indistinguishable
  anyway — at which point the honest answer is a different one and needs the
  author. Not guessed at here.
- `LaneCanvas` and the `.lane-layer` spacer arrangement in `CommitRows.svelte`
  must keep agreeing with the row's columns. This is BUG-003's territory.
- Node radius and stroke may need to shrink with the pitch, or nodes on adjacent
  compressed lanes will touch.

## Non-scope

- Raising `LANE_COLUMNS_MAX`. The measurement behind it stands, and a wider graph
  column is the thing the cap exists to prevent.
- Ref chip collapsing (`+N`). Separate concern, separate item.

## Risks

**BUG-003.** The lane canvas mirrors the row's columns so the two cannot drift.
Any change to lane geometry is the class of change that caused it. A regression
test asserting canvas and cell agreement belongs in this item's plan, written
before the geometry moves.

## Acceptance criteria

- A history with more than twelve concurrent lanes draws every lane at a
  distinct x.
- The graph column's width does not exceed its current cap at any lane count.
- A commit's node and its lane still line up exactly, at every zoom and text size.
- `lanes.test.ts` covers the compressed case, including the boundary at exactly
  `LANE_COLUMNS_MAX`.

## Dependencies

Overlaps `FEAT-033` (which extracts the column store) and `FEAT-031` (which
changes `CommitRows`). Whichever runs second rebases onto the first.
