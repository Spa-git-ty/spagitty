<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-001 — Automated tests

## What exists

None, and none is written. This item adds documentation only: no source file,
build script or configuration is touched, so there is no behaviour to assert on.

Writing tests here would mean asserting that markdown files exist, which is
padding under Amendment 10 — it executes nothing and proves nothing about the
program.

## What is checked instead

The claim this item can get wrong is that its documents disagree with the code
they describe. That is checked by reading, not by a test runner:

- Every file, symbol, command and flag named in `docs/architecture.md` and
  `docs/screens.md` was verified to exist at the commit this item lands on.
- Test names and counts quoted in `FEAT-001-automated.md` and
  `FEAT-002-automated.md` were taken from `cargo test --workspace` output, not
  from memory.

## Regression guard

Amendment 16's candidate "amendments compliance" gate — verifying that a
branch's work item ID resolves to an existing quadruplet — would make this
mechanical. It is proposed but not adopted, so it is recorded in TASK-002's
`docs/ci.md` as a candidate rather than wired up.

## Run result

`cargo test --workspace` — 14 passed, 0 failed. `npm run check` — 332 files,
0 errors, 0 warnings. Both unchanged from FEAT-002, as expected for a
documentation-only change.
