<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-005 — Automated tests

## Run result

On `bugfix/BUG-005-metrics-drift`:

| Gate | Command | Result |
| --- | --- | --- |
| 2 · format | `cargo fmt --all -- --check` | pass |
| 2 · lint | `cargo clippy --workspace --all-targets -- -D warnings` | pass, no warnings |
| 2 · types | `npm run check` | 985 files, 0 errors, 0 warnings |
| 3 · Rust tests | `cargo test --workspace` | 312 passed, 0 failed (274 core + 38 app) |
| 3 · frontend tests | `npm test` | 824 passed, 0 failed |
| 3 · coverage | `npm run coverage` | statements 78.87%, lines 78.41%, functions 75.23%, **branches 62.66%** |

Before the fix, on `main` at `c46c603`: `npm test` was 823 passed, **1 failed**.

## Tests

| Test | File | Asserts |
| --- | --- | --- |
| `row_pitch_matches_the_frontend` | `crates/spagitty-core/src/graph.rs` | Reads `src/lib/metrics.ts`, parses `export const ROW_PITCH`, asserts it equals the crate's constant. **New.** This is the regression test for the drift class this item exists for: changing either side alone fails `cargo test` with a message naming both values |
| `fits five lanes and their slack` | `src/lib/metrics.test.ts` | `laneColumnWidth(5) === 149`. **Corrected**, and its comment now carries the arithmetic |

Confirmed to fail without the fix, as Amendment 9 requires of a regression test:

- `row_pitch_matches_the_frontend` was run against the pre-fix state where the
  frontend said 26 and the crate said 30 — it fails with
  `src/lib/metrics.ts says the row pitch is 26px, this crate says 30px`.
- `fits five lanes and their slack` is the test that was already failing; it is
  what surfaced the bug.

## What is not covered by automation

- **The restored `line-height`.** A CSS declaration on `body` with no behaviour
  behind it; happy-dom resolves no cascade to assert against. SWEEP-005-01.
- **The corrected comments.** No test reads prose. Their correctness is the diff
  itself, checked against the constants beside them.
- **The design bundle being tracked and `.idea/` being ignored.** Verified by
  `git status` being clean of both after the change, not by a test.

## Coverage

Frontend, first-party, on this branch:

| Metric | Value | Amendment 10 floor |
| --- | --- | --- |
| Statements | 78.87% (4245/5382) | pass |
| Lines | 78.41% (2910/3711) | pass |
| Functions | 75.23% (1109/1474) | pass |
| Branches | 62.66% (1215/1939) | **fail** |

Stated plainly rather than left to slip: **branch coverage is below the floor and
gate 3 fails on it**, because `vite.config.ts` sets all four thresholds to 70.
This item neither caused it nor fixes it — it adds no frontend branches. The
shortfall is concentrated in `src/lib/ui/`: `Dialog.svelte`, `Menu.svelte` and
`Notice.svelte` at 0%, `dialog.svelte.ts` at 12%, `notice.svelte.ts` at 19%.
Raising it is `TASK-005`, which is not in this item's scope and should not ride
a bugfix branch.

The Rust side gained one test and no untested code.
