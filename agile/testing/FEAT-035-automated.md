<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-035 — Automated tests

**Item:** [`agile/items/FEAT-035-lane-overflow-compression.md`](../items/FEAT-035-lane-overflow-compression.md)
**Run:** `npx vitest run --coverage` — 1008 tests, 55 files, all passing.

## Coverage

| Metric | Value | Floor |
| --- | --- | --- |
| Statements | 86.91% | 70% — pass |
| Branches | 71.97% | 70% — pass |
| Functions | 84.21% | 70% — pass |
| Lines | 86.14% | 70% — pass |

`lanePitch`, `laneNodeRadius` and the rewritten `laneX` are the new logic and are
covered at every branch: under the cap, compressing, at the pitch floor, at the
index limit, and with nonsense input.

## `src/lib/metrics.test.ts`

### `lanePitch` — 5 tests

| Asserts |
| --- |
| The design pitch is unchanged for every lane count from 1 to the cap |
| Past the cap the lanes share `LANE_SPAN` — checked at 13 and at 24 |
| Pitch narrows monotonically from 13 to 60 lanes; it never steps back up |
| It never squeezes below `LANE_PITCH_MIN`, at 200, 382 and 100,000 lanes |
| The floor is wider than `LANE_STROKE`, so two lanes are two lines |

### `laneX under compression` — 7 tests

| Asserts |
| --- |
| **The defect, directly:** at 20 lanes all 20 x-positions are distinct and strictly increasing. Before this change lanes 13–20 shared one x |
| The last lane never passes `LANE_X0 + LANE_SPAN`, at 13, 16, 24, 48, 187 and 382 lanes — the property that keeps the graph out of the message column |
| While the pitch still gives, the last lane lands **exactly** on the span |
| At 5, 8 and 12 columns every lane is at `LANE_X0 + lane × LANE_PITCH` — ordinary repositories draw identically to before |
| Stacking resumes only past `LANE_INDEX_MAX`, and that limit is deeper than the old cap |
| Zoom scales x the way the reserved column scales |
| A negative lane index returns `LANE_X0` rather than a negative x |

### `laneNodeRadius` — 5 tests

| Asserts |
| --- |
| `NODE_R` is unchanged for every lane count up to the cap |
| From 13 to 32 lanes a node fits inside its own pitch — the property that stops portraits painting over the compression |
| The radius shrinks monotonically from 13 to 60 lanes |
| Past 32 lanes it overlaps, and is held at `MERGE_R` — the deliberate end of the guarantee, asserted so the trade is recorded rather than rediscovered |
| At most 12 distinct sizes across 400 lane counts, so the portrait tile cache is not churned |

### `the canvas is always wide enough for the lanes it draws` — 3 tests

**This is the BUG-003 guard**, and it is why it exists: the lane canvas mirrors
the row's columns so the two cannot drift, and this item moves lane geometry —
the class of change that caused BUG-003.

| Asserts |
| --- |
| `laneX(deepest) + laneNodeRadius` ≤ `laneColumnWidth`, for lane counts 1, 5, 8, 12, 13, 16, 24, 48, 49, 100, 187 and 382. The failure message names the lane count |
| The same at zoom 1, 1.3, 1.7 and 2 |
| `laneColumnWidth` returns one identical width for every history past the cap |

## `src/lib/graph/rows.test.ts` — 1 test

`stops widening the lane column at the cap, however deep the history`. The
geometry tests prove the arithmetic; this proves it is **wired**. Renders
`CommitRows` with a history reaching 12, 20, 60 and 200 lanes and asserts
`.lane-space` holds one width throughout. Its failure message names the depth
that widened it.

This is the property the author actually asked for, so it is asserted at the
component rather than inferred from the units.

## Tests deliberately not changed

Every pre-existing geometry assertion in `metrics.test.ts`, `lanes.test.ts` and
`rows.test.ts` passes **unmodified**. That is itself the evidence that ordinary
repositories are unaffected: had compression leaked below the cap, the existing
`laneX(7, 10) === LANE_X0 + 7 × LANE_PITCH` and the `NODE_R` radius assertions in
`lanes.test.ts` would have failed.

## Two failures found while writing these, and what they changed

Both were the tests being wrong in a way that exposed the code over-promising,
and both were fixed in the code's documentation rather than papered over:

1. `never lets a node cover its neighbour's lane` failed at 48 lanes — 9 > 6.09.
   The `MERGE_R` floor genuinely does overlap at depth. The guarantee is real up
   to 32 lanes and ends there; the test now asserts the true bound and a second
   test pins the overlap as deliberate.
2. `stays on whole pixels` failed because `MERGE_R` is 4.5 by design. The
   underlying concern was cache churn, not integers, so the test now asserts the
   property that actually matters — a bounded number of distinct sizes.

`laneNodeRadius` was also changed from `Math.round` to `Math.floor` while fixing
the first: rounding up could hand back a node wider than the pitch it was derived
from.

## Not covered here

That a compressed graph is *legible* — that a 20-lane column reads as twenty
lanes rather than a smear. Headless verification cannot see it, and Amendment 4
keeps the app unlaunched. It is `FEAT-035-T3` and `T4` in the manual sweep, and
it is the ticket most likely to send this item back.
