<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-002 — Automated tests

## What exists

All seven sit in `crates/gitlord-core/src/diff.rs` and test the pure functions
beneath the commands, so they need no repository fixture.

| Test | Layer | Asserts |
| --- | --- | --- |
| `binary_sniffing_matches_gits_rule` | core, unit | A NUL inside the sniff window marks a blob binary; a NUL past it does not, which is git's rule rather than a stricter one. |
| `empty_range_headers_use_gits_convention` | core, unit | An empty range starts at 0, a non-empty one at `start + 1`. |
| `one_changed_line_gets_context_either_side` | core, unit | One changed line yields a single hunk with three context lines on each side, the right `@@` header, and correct old/new numbers across the change — including that context after the change keeps counting on both sides. |
| `distant_changes_split_into_separate_hunks` | core, unit | Two changes whose context cannot meet produce two hunks, in order. |
| `an_addition_diffs_against_nothing` | core, unit | A new file produces `@@ -0,0 +1,n @@` with every line added. |
| `crlf_terminators_are_not_shown` | core, unit | A CRLF file's line text excludes the terminator. |
| `a_binary_side_reports_no_lines` | core, unit | A binary side reports `binary` with zero added and removed rather than a guess. |

Run result: `cargo test --workspace` — 14 passed, 0 failed, 0 ignored
(7 here, 7 from FEAT-001).

## Coverage

Not measured at the time this item landed; no coverage tooling existed. The
first measured figure against the Amendment 10 floor of 70% is recorded in
TASK-002, which also adds the tests listed below.

## Known gaps, carried into TASK-002

- `commit_diff` and `file_diff` themselves are untested — rename detection, the
  first-parent choice for a merge, `UnknownCommit` and `UnknownPath`. All need
  a repository fixture.
- `src/lib/diff/split.ts` — `splitRows` is pure, self-contained, and the single
  most testable thing in the frontend. Uneven run pairing and the
  context-flushes-the-run rule are the cases that matter.
- `src/lib/diff/store.svelte.ts` — the two-step load, the per-path cache, the
  sequence guards, and `step` clamping at either end.
