<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-029 — Automated tests

## Run result

Measured on `bugfix/BUG-005-metrics-drift`:

| Gate | Result |
| --- | --- |
| `cargo test --workspace` | 312 passed, 0 failed (274 core + 38 app) |
| `npm test` | 824 passed, 0 failed |
| `npm run check` | 0 errors |

As the feature originally landed on `main` the frontend suite was **1 failed** —
`metrics.test.ts` still asserted the old five-lane column width. The geometry
change shipped without its test being updated; that is BUG-005, and the run above
is after the correction.

## Tests covering this item

| Test | File | Asserts |
| --- | --- | --- |
| `already_visited_parents_do_not_leave_dangling_edges` | `crates/gitlumiere-core/src/graph.rs` | A merge whose second parent was already walked closes its lane instead of opening one; the walk ends with `width() == 0` and no edge left pointing at an undrawn row. Written with the fix |
| `row_pitch_matches_the_frontend` | `crates/gitlumiere-core/src/graph.rs` | The Rust `ROW_PITCH` equals the value declared in `src/lib/metrics.ts`, read from the file. Added by BUG-005 to hold this item's geometry together |
| `fits five lanes and their slack` | `src/lib/metrics.test.ts` | `laneColumnWidth(5) === 149` — the arithmetic of the new node radius, lane pitch and origin. Corrected by BUG-005 |
| `widens by one lane pitch per extra column` | `src/lib/metrics.test.ts` | Derived from `LANE_PITCH`, so it followed the constant without editing |
| `steps by the lane pitch`, `places lane 0 at the design offset` | `src/lib/metrics.test.ts` | Same — expressed in terms of the constants, which is why they survived the change |
| `publishes every structural metric as a px custom property` | `src/lib/metrics.test.ts` | `--row-pitch` and `--lane-pitch` reach CSS with units, at the new values |
| `visibleRange` suite | `src/lib/graph/lanes.test.ts` | Virtualization arithmetic against `ROW_PITCH`; catches a pitch change that the row list and the canvas disagree about |

The pattern worth keeping: every assertion written *in terms of the constants*
survived this change untouched. The single assertion written as a literal is the
single one that broke.

## What is not covered by automation

- **That a portrait reads as a face.** The entire motivation for the item is a
  perceptual judgement no assertion can make. SWEEP-029-01.
- **Font smoothing and `optimizeLegibility`.** Rendering, not layout; invisible
  to happy-dom. SWEEP-029-04.
- **The rail scaling with the dials.** The token indirection could be asserted by
  reading computed styles, but happy-dom does not resolve custom properties
  through a stylesheet cascade the way a browser does. SWEEP-029-03.
- **The selection band.** A missing `border-radius` is not observable in the test
  environment. SWEEP-029-02.
- **The graph at a real repository's lane depth**, where `visited` actually
  fires. The Rust test drives `LaneState` directly with synthetic ids;
  SWEEP-029-05 exercises it against a real history.

## Coverage

First-party coverage on this branch, `npm run coverage`:

| Metric | Value |
| --- | --- |
| Statements | 78.87% (4245/5382) |
| Lines | 78.41% (2910/3711) |
| Functions | 75.23% (1109/1474) |
| Branches | **62.66%** (1215/1939) |

Three of four are over the Amendment 10 floor; branches is under it, which fails
gate 3 as `vite.config.ts` configures it. This is **pre-existing and not caused
by this item** — FEAT-029 adds no frontend branches at all. The shortfall sits in
`src/lib/ui/` (`Dialog.svelte`, `Menu.svelte`, `Notice.svelte`, `dialog.svelte.ts`
and `notice.svelte.ts` are all at or near zero). Recorded as `TASK-005`.

Rust coverage is not measured on this branch; the crate gained two tests and no
untested code.
