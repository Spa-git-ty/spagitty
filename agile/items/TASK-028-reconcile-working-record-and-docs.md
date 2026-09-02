<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-028 — Reconcile working record and docs

**Status:** Done — merged into `dev` by direct push at the author's explicit instruction (Amendment 14 waived for this item per Appendix A).
**Screens:** —.
**Raised by:** the author: "yes do that reconcile".

## Problem

Multiple completed items (TASK-024, TASK-025, TASK-026, FEAT-059, and FEAT-060)
were merged into `dev` and `main` via pull requests #3 through #9, but their
status lines in `agile/items/` and in the `agile/README.md` index were still
recorded as `Open`. Additionally, FEAT-060 was listed under Tasks instead of
Features in the working record index.

Under Amendment 11 and Amendment 12, staleness in documentation is a defect, and
the working record must accurately reflect reality.

## Change

- Update status lines for `FEAT-059`, `FEAT-060`, `TASK-024`, `TASK-025`, and
  `TASK-026` from `Open` to `Done` in `agile/items/`.
- Reconcile `agile/README.md`: mark merged items as `Done`, move `FEAT-060` to
  the Features table, and record `TASK-028`.
- Validate with `tools/record.test.ts` to guarantee that the record index and
  the repository state match without discrepancies.

## Non-scope

- Code modifications or refactoring.
- Performing a release to `main`.

## Acceptance criteria

- `bun run test tools/record.test.ts` passes with zero failures.
- No merged item in `agile/items/` or `agile/README.md` is left marked as `Open`.
- `FEAT-060` is indexed under Features in `agile/README.md`.
