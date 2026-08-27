<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-001 — Automated tests

**Recorded retroactively under TASK-001**, against the tests that shipped with
commit `4e8ea60`.

## What exists

| Test | Layer | Asserts |
| --- | --- | --- |
| `graph::tests::linear_history_uses_one_lane` | core, unit | A chain of single-parent commits stays in lane 0 with one colour; the first row draws no edge; a root releases its lane. |
| `graph::tests::merge_branches_out_and_converges` | core, unit | A merge reserves a lane per parent; the branch-out elbow spans exactly the row below its node; the side commit lands in its reserved lane and keeps that lane's colour; convergence lands in the lowest waiting lane and the merge-in elbow keeps the incoming colour. |
| `graph::tests::lanes_are_reused` | core, unit | A freed lane is picked up again rather than the graph widening without bound. |
| `graph::tests::merge_edges_reuse_an_awaited_lane` | core, unit | A parent already awaited in a lane does not get a second lane. |
| `graph::tests::a_joining_merge_edge_is_drawn` | core, unit | The joining edge is emitted, not just the lane bookkeeping. |
| `graph::tests::colors_cycle_and_stick_to_a_lane` | core, unit | Colour index cycles through `LANE_COLOR_COUNT` and is stable for a lane's lifetime. |
| `graph::tests::initials_are_two_letters` | core, unit | Author initials are at most two uppercase letters, with `?` for a name that yields none. |

Run result at the time of writing: `cargo test --workspace` — 14 passed, 0
failed (this figure includes FEAT-002's seven diff tests).

## Coverage

Not measured. The repository had no coverage tooling when FEAT-001 landed;
`cargo-llvm-cov` and Vitest arrive under TASK-002, and the first measured figure
against the Amendment 10 floor of 70% is recorded there.

## Known gaps, carried into TASK-002

- `graph::walk` itself is untested — only the `LaneState` fold beneath it is.
  Testing the walk needs a real repository fixture, which arrives with the
  `tempfile` dev-dependency in TASK-002.
- `refs::RefIndex::build`, `repo::info`, `repo::head` and `status::counts` have
  no tests. All four need a fixture repository for the same reason.
- The whole frontend is untested: `graph/lanes.ts`, `format.ts`, `metrics.ts`,
  `nav.ts` and every store. No JavaScript test runner existed.
- `src-tauri` — the command layer, the graph worker's batching and token
  handling, and the watcher's debounce — is untested.
