<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-005 — The geometry change left its test, its comments and a CSS rule behind

**Status:** fixed, awaiting sweep
**Branch:** `bugfix/BUG-005-metrics-drift`

## Problem

`994dbe9` landed TASK-004 and FEAT-029 together, directly on `main`, and pushed.
Three defects came with it.

**1. A red test suite on `main`.** `laneColumnWidth(5)` returns 149 with the new
geometry; `src/lib/metrics.test.ts:44` still asserted 129.

```
FAIL  src/lib/metrics.test.ts > laneColumnWidth > fits five lanes and their slack
AssertionError: expected 149 to be 129
```

Gate 3 of the Amendment 16 pipeline fails on `main` as it stands.

**2. `src/lib/metrics.ts` describes numbers the file no longer holds.** The file
opens by declaring itself the single source of truth for structural metrics, so
a wrong comment there is worse than a wrong comment anywhere else in the
frontend — it is the document the next person changing the geometry reads first.
Every one of these was false as committed:

| Location | Claimed | Actual |
| --- | --- | --- |
| header | "no second `26` anywhere in the frontend" | 26 is `LANE_PITCH` now |
| header | `metrics_match` asserts the Rust mirror | no such test has ever existed |
| `LANE_PITCH` | `2 × NODE_R + LANE_STROKE` is 20.5, and 22 clears it | 24.5, cleared by 26 |
| `LANE_X0` | "lanes sit at 14, 36, 58, 80, 102" | 16, 42, 68, 94, 120 |
| `NODE_R` | "seventeen pixels across … at the 26px row pitch" | 22 across, 30px pitch |
| `MERGE_R` | "half the portrait" | 4.5 against 11 |
| `LANE_TAIL` | "kept at the retuned 15px pitch" | the pitch is 26 |
| `LANE_COLUMNS_MAX` | a table of column widths, and "twelve leaves the message column wider" | every width moved; at twelve the lane column is now the wider of the two |
| `graph.rs:41` | `metrics_match` again | — |
| `docs/screens.md:120` | "node radius 8.5, lane pitch 22 … 149px column is 129px" | 11, 26, 149px |

**3. `line-height: var(--lh-ui)` was deleted from `body`** in `src/app.css`, in
the same hunk that changed font smoothing, and is mentioned nowhere in the commit
message. `--lh-ui: 1.35` stayed defined but was left used by exactly one
component, so the whole application fell back to the browser's default line
spacing — at the same moment the type scale grew 20%.

## Reproduction

1. Check out `main` at `c46c603`.
2. `npm test` → 1 failed, 823 passed.
3. `grep -n 'metrics_match' -r .` → two doc comments, no test.
4. Open `src/app.css` and look for `line-height` on `body` → absent.

**Observed:** a red suite, a source-of-truth file that misinforms, and prose
line spacing at the browser default.
**Expected:** green suite, comments that match the constants beside them, and the
line height the design system defines.

## Scope

- Correct the failing expectation to the real arithmetic.
- Correct every stale comment listed above, in `metrics.ts`, `graph.rs`, and
  `docs/screens.md`.
- Restore `line-height: var(--lh-ui)` on `body`.
- Add the Rust/TypeScript `ROW_PITCH` assertion the comments have been promising
  since FEAT-001, so this class of drift fails a gate instead of a reader.
- Backfill the `agile/` triplets the two landed commits never got: TASK-004 and
  FEAT-029.
- Stop `.idea/` from appearing as untracked noise; commit the
  `design_handoff_gitlord/` design bundle, which has been sitting untracked since
  the project began.

## Non-scope

- **Rewriting history.** `994dbe9` and `c46c603` are pushed. They violate
  Amendment 14 — nothing enters a protected branch except by pull request — and
  that stands as a matter of record rather than being erased.
- **Reverting any of FEAT-029.** Every behaviour it introduced is kept as a
  feature; only what it broke around itself is repaired.
- **The branch-coverage shortfall.** Gate 3 also fails on branch coverage
  (62.66% against a 70% floor), which predates all of this. `TASK-005`.
- **`dev` being stranded** at the first scaffold commit while `main` carries the
  project. A real process problem, and a separate one.

## Acceptance criteria

- `npm test` green; `cargo test --workspace` green; `npm run check` clean;
  `cargo clippy -D warnings` clean; `cargo fmt --check` clean.
- No comment in `metrics.ts`, `graph.rs`, or `docs/screens.md` states a number
  the code does not hold.
- Changing `ROW_PITCH` on one side of the language boundary alone fails
  `cargo test`.
- `body` carries `line-height: var(--lh-ui)`.
- TASK-004 and FEAT-029 each have item, plan, automated and sweep documents.

## Environment

Linux 7.1.8-arch1-3, node 26 toolchain, Rust 1.77+, vitest 4.1.10.

## Dependencies

Fixes the fallout of TASK-004 and FEAT-029; both are recorded as done.
