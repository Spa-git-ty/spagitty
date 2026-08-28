<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-053 — Automated tests

**Item:** [`agile/items/FEAT-053-square-lane-turns.md`](../items/FEAT-053-square-lane-turns.md)
**Plan:** [`agile/plans/FEAT-053-plan.md`](../plans/FEAT-053-plan.md)

| Test | Layer | What it asserts |
| --- | --- | --- |
| `turns square, with two rounded corners, for a lane that changes column` | `src/lib/graph/lanes.test.ts` | Two `arcTo` calls and their exact corner points — out of the old lane at the band's middle, then down into the new one — and that the path finishes vertically at the destination row's centre. Replaces the test that asserted a cubic. |
| `turns tighter rather than bulging when the lanes are close together` | `src/lib/graph/lanes.test.ts` | The clamp. At forty lanes the radius is no more than half the crossing, and still greater than zero. |
| `draws a straight segment for a lane that does not move` | `src/lib/graph/lanes.test.ts` | Re-pinned: a lane that stays put uses no `arcTo` at all. |
| `draws nodes on top of the edges that reach them` | `src/lib/graph/lanes.test.ts` | Re-pinned to look for `arcTo` rather than `bezierCurveTo` when finding the last edge command. |
| `draws the entry hanging off its commit` | `src/lib/stash/panes.test.ts` | The stash lane is arcs and no longer a cubic — `A` present, `C` absent — so the two screens draw a stash the same way. |

## What is not covered

- **That it looks right.** A test can say there are two arcs at the right
  coordinates; it cannot say the result reads as a corner. That was checked by
  running the application and looking at it — see the plan, and SWEEP-053.
- **The radius being 6 rather than 4 or 8.** A judgement, made by eye.
