<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-039 — The graph column resizes, and the lanes compress into it

**Status:** Done on `feature/FEAT-039-resizable-graph-column`.
**Screen:** Graph (1A).
**Reported by:** the author, with a screencast, after BUG-009b.

## Problem

BUG-009b made the boundary move the right way. It did not make the **graph**
move: no matter how much of the table was narrowed, the graph column stayed
exactly as wide as its lane count said, so a wide graph column with a lot of
empty space in it could not be reclaimed.

The author's words: *"the resize pushes the right way now, but it does not push
the graph — the graph is fixed whatever happens. Then why did we build the
collapsing?"*

That is the fair question. FEAT-035 built lane compression, and it could only be
reached by *having more lanes* — never by asking for a narrower column.

## Cause

`resize` refused the graph column outright:

```ts
// The graph's width is computed from the lanes on screen; a narrower one
// draws commits on top of each other, so it is not draggable.
if (column.computed) return;
```

The comment's reasoning was true **before FEAT-035**. A narrower column did draw
commits on top of each other, because `laneX` clamped the lane index. It no
longer does: lanes share out the space they are given, down to a floor.

So the refusal outlived its reason.

## Scope

- **`computed` and `fills` stop meaning "cannot be sized"** and mean what they
  always described: what a column does when it has *not* been given a width.
  The graph sizes itself to the lanes until dragged; the message column fills
  until dragged. Both go back on a double-click.
- The graph's catalogue width becomes `0`, the same "size yourself" convention
  the filling column already used, so a stored width is what says someone chose
  one.
- **`lanePitch`, `laneX` and `laneNodeRadius` take the span they must fit into**
  rather than assuming `LANE_SPAN`. New `laneSpanFor(width, zoom)` is the
  inverse of `laneColumnWidth`: what is left for lanes inside a chosen width.
- Every divider now sizes the column it sits on. No divider is inert, so the
  `fixed` state and its styles are gone.
- The graph's minimum drops from 60px to 48px — with the lanes compressing there
  is a useful column well below the old floor.

## Non-scope

- Collapsing the graph column to nothing, or a toggle to hide it. It is
  `required`, and a graph screen with no graph is a list.
- Changing what compression does past the floor. Lanes still stack once the
  pitch reaches `LANE_PITCH_MIN`; a narrower column simply reaches that sooner.

## Acceptance criteria

- The Graph column can be dragged narrower and wider.
- Its lanes compress to fit, and every lane stays inside the column at every
  width and zoom.
- The node shrinks with the pitch, as it does under FEAT-035.
- Double-clicking its divider hands it back to the lanes.
- Undragged, it behaves exactly as before: it follows the lane count.

## Dependencies

FEAT-035, which built the compression this exposes. BUG-009b, which fixed the
direction the boundary moves.
