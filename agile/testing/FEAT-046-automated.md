<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-046 — Automated tests

**Item:** [`agile/items/FEAT-046-graph-squeeze-keeps-the-portraits.md`](../items/FEAT-046-graph-squeeze-keeps-the-portraits.md)
**Files:** `src/lib/graph/lanes.test.ts` — a `squeezing the column keeps the
portraits` block, drawing against the recording canvas the file already uses and
reading the radius back out of the `arc` calls. `src/lib/metrics.test.ts` — one
assertion that the five-lane floor is a width.

## Tests

| Test | Holds in place |
| --- | --- |
| `draws the same size node at every column width it can be dragged to` | the item: six widths from 331px to 60px, and the portrait is `NODE_R` in all of them |
| `still shrinks the node when the history itself is deeper than the span` | the case nobody asked for stays as it was — 30 lanes still come down |
| `shrinks by depth alone, so the drag cannot change it` | fourteen lanes draw the same radius at 200px and at 331px: depth decides, the drag does not |
| `keeps the node inside the column it was given` | BUG-003's invariant, re-asserted with a node that no longer follows the drag |
| `folds the lanes behind the faces rather than moving the faces` | the lanes still compress — a narrow column puts three lanes closer than one portrait is wide, and the last one stays inside the span |
| `does not squeeze a two-lane repository as though five lanes had to fit` | the phantom floor: two lanes in room for two keep the design pitch, five in the same room still compress |
| `starts compressing exactly where the lanes actually meet` | the boundary — one pixel narrower than `(needed - 1) × LANE_PITCH` and the pitch gives, not before |
| `leaves the design span drawing what it always drew` | an undragged column is untouched by any of this |
| `never asks for less than the design width, however few lanes there are` | the floor still exists, in `laneColumnWidth`, which is where it belongs |

Each of the four that pin the new behaviour was run against the unmodified
geometry first and fails there, so none of them passes vacuously.

## Untouched, and deliberately so

`lanePitch`, `laneNodeRadius` and `laneSpanFor` are unchanged and so are their
tests, including `brings the node down with the pitch in a narrowed column` —
the function still does that, and it is `drawLanes` that no longer asks it to.
The compression itself, the pitch floor and the column's minimum width are all
out of scope and untested here beyond the invariant above.

## Coverage

1356 tests across 56 files. 1335 pass; the 21 failures are `src/lib/scale.test.ts`
under happy-dom 20, where `localStorage` is undefined. They predate this branch
and FEAT-045's, and are unrelated to the graph.

`npm run check` reports 0 errors and 0 warnings across 993 files.

## Not covered here

- That the faces overlapping each other at a very narrow column still read as
  faces rather than as a stack. A judgement against a real screen —
  `FEAT-046-T3` in the sweep.
- That node and lane share an x on a device-pixel boundary at every zoom. The
  arithmetic is asserted; the pixel is `FEAT-046-T4`.
- The first-frame lane count. `CommitRows` now starts at one lane rather than
  five, and that it never shows as a flicker is `FEAT-046-T5`.
