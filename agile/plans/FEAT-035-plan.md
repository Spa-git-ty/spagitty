<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-035 — Plan

**Item:** [`agile/items/FEAT-035-lane-overflow-compression.md`](../items/FEAT-035-lane-overflow-compression.md)
**Branch:** `feature/FEAT-035-lane-compression`
**Status:** implemented.

## Approach

The cap on **width** stays exactly where it is — its measurements on `cli/cli`
still hold and the column must not grow into the message column. What changes is
what happens at the cap: the *pitch* gives instead of the lane *index* being
clamped.

One derived constant carries it. `LANE_SPAN = (LANE_COLUMNS_MAX - 1) × LANE_PITCH`
is the distance from lane 0 to the rightmost lane — 286px. Compression shares
that span out between however many lanes are actually present, so the last lane
always lands in the same place and the column's width stops depending on the
history.

```
lanePitch(n) = n <= 12 ? LANE_PITCH : max(LANE_PITCH_MIN, LANE_SPAN / (n - 1))
```

`LANE_SPAN` is derived rather than written down, so it cannot drift from the cap.

### Why the lane count had to stop being clamped twice

The clamp existed in two places, and both had to go for the geometry to see the
real number:

1. `CommitRows.svelte` wrapped `lanesNeeded(...)` in `laneColumns(...)`, capping
   at twelve **before storing it**.
2. `laneX` then clamped the index again against that already-capped figure.

`laneCount` now carries the true count. The width it feeds is still capped —
`laneColumnWidth` clamps internally and needed no change at all — but the
geometry gets the real figure, which is the whole fix.

### The node had to come down with the pitch

`LANE_PITCH` is 26 because of the node: the file's own words are "a lane closer
than a node is wide draws lines through faces". Compressing the pitch while
leaving `NODE_R` at 11 would have drawn the portraits straight back over the
lanes the compression just separated — undoing the feature at the last step.

`laneNodeRadius(n)` therefore derives the radius from the pitch, rounded **down**
so it can never come back wider than the pitch it came from, and floored at
`MERGE_R`.

### Two limits, stated rather than hidden

Neither is a defect and both are asserted, so the trade is recorded:

| Limit | Where | Why |
| --- | --- | --- |
| Nodes begin to overlap past **32 lanes** | `MERGE_R` floor is wider than the pitch there | A node that kept shrinking would stop being visible at exactly the depth where it is the only thing locating a commit |
| Lanes begin to stack past **48 lanes** | pitch is at `LANE_PITCH_MIN` | Below a 6px pitch two 2.5px strokes merge into one band; squeezing further trades a readable overflow for an unreadable one |

The second is the old behaviour, reached four times deeper than before. `git/git`
peaks at 382 lanes and still overflows — some histories defeat any width — but 48
of them stay tellable apart where twelve did.

### Alternatives rejected

- **Raise `LANE_COLUMNS_MAX`.** The measurement behind twelve stands, and a wider
  graph column is the thing the cap exists to prevent. It also only moves the
  problem.
- **Scroll the lane column horizontally.** Puts the graph and its rows on two
  different scroll offsets, which is BUG-003 wearing a different hat.
- **Shrink the whole column, pitch and all, to fit.** Makes ordinary
  five-lane repositories pay for the rare deep one.

## Files

| File | Change |
| --- | --- |
| `src/lib/metrics.ts` | `LANE_SPAN`, `LANE_PITCH_MIN`, `LANE_INDEX_MAX`, `lanePitch`, `laneNodeRadius`; `laneX` rewritten |
| `src/lib/graph/lanes.ts` | node radius from `laneNodeRadius(columns)` rather than `NODE_R` |
| `src/lib/graph/CommitRows.svelte` | `laneCount` keeps the true count; unused `laneColumns` import dropped |
| `src/lib/metrics.test.ts` | 21 new assertions across four groups |
| `src/lib/graph/rows.test.ts` | component-level guard that the column stops widening |
| `docs/screens.md` | the compression, and both limits |

`laneColumnWidth` is deliberately untouched: it already caps internally, and
compression is designed to fit inside exactly the width it was already
reserving.

## Risks

**BUG-003 — the real one.** The lane canvas mirrors the row's columns so the two
cannot drift, and this change moves lane geometry, which is the class of change
that caused BUG-003. Guarded by an explicit test group asserting that the deepest
lane plus its node radius never exceeds the canvas width `laneColumnWidth` hands
out — across twelve lane counts from 1 to 382, and at every zoom the scale dial
offers. Written to be structurally unable to come back rather than checked by
eye.

**Portrait cache churn.** The radius picks the tile size and the cache is keyed
on it, so a radius moving continuously with depth would mint a tile per author
per scroll. Held down by rounding to whole pixels; asserted at ≤ 12 distinct
sizes across 400 lane counts.

**Behaviour at or under twelve lanes must be untouched**, since that is every
ordinary repository. Asserted directly: `laneX(lane, columns)` equals
`LANE_X0 + lane × LANE_PITCH` for every lane at 5, 8 and 12 columns, and every
pre-existing geometry test passes unmodified.

## Rollback

Revert the branch. `laneColumnWidth` never changed, so nothing outside the canvas
and the reserved column is involved.

## Verification

```
npx vitest run --coverage   # 1008 tests, 55 files; branches 71.97%
npm run check               # 991 files, 0 errors, 0 warnings
```

Not verified visually — Amendment 4, and the wheel has not been handed over. The
manual sweep carries the tickets that need eyes.
