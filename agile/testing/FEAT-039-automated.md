<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-039 — Automated tests

**Item:** [`agile/items/FEAT-039-resizable-graph-column.md`](../items/FEAT-039-resizable-graph-column.md)
**Files:** `src/lib/graph/columns.test.ts` and `src/lib/metrics.test.ts` — 19
assertions added.

*Backfilled by TASK-013. Every test named here exists and passes.*

## The store — what a column does when nobody has dragged it

| Test | Holds in place |
| --- | --- |
| `sizes itself until it is dragged` | the graph follows the lanes while its stored width is `0` |
| `takes a width when it is dragged` | **the feature**: the refusal is gone |
| `clamps to a width lanes can still be drawn in` | the 48px floor |
| `goes back to sizing itself on unsize` | double-click hands the column back to the lanes |
| `is still required, so it cannot be hidden away` | a graph screen with no graph is a list |
| `resizes the graph column too, now that it has a width to take` | the same from the resize path |
| `sizes the column the divider sits on` | BUG-009b's inversion is gone, because no column is unsizable now |
| `leaves no divider without a job` | the `fixed` state is gone and must not come back |

## The arithmetic — lanes inside a width somebody chose

| Test | Holds in place |
| --- | --- |
| `is the inverse of laneColumnWidth` | `laneSpanFor` round-trips |
| `never goes negative, however narrow the column` | the arithmetic survives a column narrower than its padding |
| `scales with zoom, so a zoomed column has the same lanes in it` | zoom and width are independent |
| `keeps the design pitch when the column is wide enough` | a wide column looks exactly as it did before this item |
| `tightens the pitch as the column narrows` | the compression, reached by dragging |
| `never widens past the design pitch, however wide the column` | lanes do not sprawl |
| `never squeezes below the floor, however narrow` | FEAT-035's floor still governs |
| `keeps every lane inside the column it was given` | **the invariant the first implementation got wrong** — asserted across widths and zooms rather than at one example |
| `brings the node down with the pitch in a narrowed column` | the node follows the pitch, as FEAT-035 decided |

The last one is the decision a later screencast from the author argues with:
that the *portrait* should win over the pitch when the narrowing is something the
user did by dragging, as GitKraken's does. That is a change to this decision, not
a defect in it, and it belongs to the item that makes it.

## Coverage at the time

1081 tests across 55 files, all passing; branches 72.8%, all four metrics over
the Amendment 10 floor.

## Not covered here

- That the drag *feels* right — that the boundary tracks the pointer and the
  lanes reflow live rather than on release. `FEAT-039-T1` in the sweep.
- That a compressed graph is still readable to a person. Arithmetic can prove
  every lane has a distinct x; only a person can say whether it can be followed
  — `FEAT-039-T3`.
