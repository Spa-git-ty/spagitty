<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-052 — Automated tests

**Item:** [`agile/items/FEAT-052-graph-reads-at-depth.md`](../items/FEAT-052-graph-reads-at-depth.md)
**Plan:** [`agile/plans/FEAT-052-plan.md`](../plans/FEAT-052-plan.md)

Mostly existing tests re-pinned to new arithmetic. That is what a metrics change
looks like when the metrics were already covered, and the interesting part is
which assertion had to *change meaning* rather than change a number.

| Test | Layer | What it asserts |
| --- | --- | --- |
| `shares the span out once there are more lanes than columns` | `src/lib/metrics.test.ts` | Re-pinned. Both counts now sit above the cap **and** above the floor, which is where sharing actually happens; the old 24 is past the new floor and clamps. |
| `lands the last lane exactly on the span while the pitch still gives` | `src/lib/metrics.test.ts` | Re-pinned to the deepest count the floor still allows. |
| `never squeezes below the floor, however deep the history` | `src/lib/metrics.test.ts` | Unchanged, and now means something visible. |
| `keeps a lane wider than the line drawn in it` | `src/lib/metrics.test.ts` | Unchanged. Was the weakest possible statement of the thing that was wrong — 6 > 2.5 is true and was not enough. |
| `never lets a node cover its neighbour, at any depth at all` | `src/lib/metrics.test.ts` | **Changed meaning.** There used to be a depth past which nodes overlapped, recorded as a deliberate trade. The wider floor removed it: 382 lanes and 100,000 lanes both keep a node inside its own lane. |
| `stops shrinking at the widest node the narrowest lane can hold` | `src/lib/metrics.test.ts` | New. The radius bottoms out on the pitch floor rather than on `MERGE_R`, which is still the hard floor and no longer the binding one. |
| `never shrinks past the graph's smallest meaningful mark` | `src/lib/metrics.test.ts` | Rewritten to assert the guarantee rather than the particular number it used to equal. |
| `gives every lane past the cap a distinct x` / `keeps the last lane inside the span at any lane count` / `stacks only once the pitch has nowhere left to go` | `src/lib/metrics.test.ts` | Unchanged and still passing, which is the check that FEAT-035's compression still behaves — only its floor moved. |
| `puts an edge on each side, and lets clicks through both` | `src/lib/graph/rows.test.ts` | New. Two edges, both `aria-hidden`, both `pointer-events: none` — they sit over the rows, so what they cover has to stay reachable. |
| `shows no edge shadow when there is nothing under it` | `src/lib/graph/rows.test.ts` | New. The affordance must be absent when it would be a lie. happy-dom lays nothing out, so this is the un-overflowed case by construction. |

## What is not covered

- **That it looks better.** No test can say so. The pitch, the alignment and the
  edges are all verifiable as numbers and none of the numbers is the thing that
  was wrong — a screen is. SWEEP-052-01 through -04.
- **The edge appearing.** happy-dom reports every element as zero-sized, so
  `scrollWidth` is always 0 and the overflowing case cannot be constructed. What
  is testable is the shape and the not-overflowing case; the rest is SWEEP-052-03.
- **The ref alignment.** A CSS property with no behaviour behind it. SWEEP-052-02.
