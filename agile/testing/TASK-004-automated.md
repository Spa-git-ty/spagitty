<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-004 — Automated tests

## Run result

Measured on `bugfix/BUG-005-metrics-drift`, which is `main` plus the BUG-005
corrections:

| Gate | Result |
| --- | --- |
| `cargo fmt --all -- --check` | pass |
| `cargo clippy --workspace --all-targets -- -D warnings` | pass, no warnings |
| `cargo test --workspace` | 312 passed, 0 failed (274 core + 38 app) |
| `npm run check` | 985 files, 0 errors, 0 warnings |
| `npm test` | 824 passed, 0 failed |

At the moment TASK-004 landed on `main` the frontend suite was **823 passed, 1
failed** — the failure belonged to FEAT-029's geometry, not to the rename; see
BUG-005.

## Tests written for this item

None, and deliberately. A rename has no behaviour of its own to assert: its
correctness is that every existing test still passes against the new names,
which is exactly what the run above shows. Writing a test that asserts a crate
is called what it is called would assert the compiler's own job.

Two mechanical checks stand in for a test, and both are part of the item's
acceptance criteria rather than the suite:

| Check | Asserts |
| --- | --- |
| `grep -rIi gitlord` over tracked files | No occurrence of the old name survives outside `design_handoff_gitlord/`, which keeps it by design |
| `cargo test --workspace` compiling at all | Every `gitlord_core` path moved; a missed import is a hard compile error |

## What is not covered by automation

- That the renamed **bundle identifier** produces a working installed
  application, and that the capability manifest still grants what the app needs
  at runtime. Nothing in the test suite builds a bundle. Covered by
  SWEEP-004-01 and SWEEP-004-02.
- That **persisted state under the new keys** is written and read back. The
  store tests use the new keys throughout, so a mismatch between two halves of
  the app would fail; a mismatch between the app and a *previously stored* value
  is the accepted one-time loss recorded in the item's non-scope, and is
  SWEEP-004-03.
- That no user-facing string still reads GitLord in the built UI. Grep covers
  the source; the rendered result is SWEEP-004-04.

## Coverage

The rename moves lines without adding logic, so it neither raises nor lowers
first-party coverage. The Amendment 10 floor is assessed on the branch as a
whole in `BUG-005-automated.md`.
