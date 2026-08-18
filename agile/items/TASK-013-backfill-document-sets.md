<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-013 — Backfill the missing plan and testing documents

**Status:** Done on `task/TASK-013-backfill-documents`.
**Surface:** `agile/plans/`, `agile/testing/`.
**Recorded by:** TASK-012, which found these gaps and declared them out of its
own scope.

## Problem

Five merged items carry an item document and nothing else. Amendment 12 asks for
four documents before an item is done, and for these it did not happen:

| ID | What shipped |
| --- | --- |
| FEAT-018 | Fetch and push, which landed inside FEAT-038 |
| FEAT-036 | One chip per branch |
| FEAT-038 | Pull, and the centred toolbar |
| FEAT-039 | The resizable graph column |
| TASK-011 | gitleaks in gate 4 |

Fifteen documents. The work is written from the branches, the commit messages
and the tests that already exist, so this is recovery of a record, not
invention: anything that cannot be recovered honestly is written as unknown
rather than reconstructed.

**What doing it found.** FEAT-018 was not `Done`. TASK-012 read it as finished
from the live toolbar buttons; reading the code for the plan showed that three
of the five things the item scoped — pruning as an explicit choice, an upstream
on first push, per-remote fetch — were never built, and that pruning happens
silently on every fetch although the item's own notes call it destructive. The
item is now `Partial` and its plan says what is still owed. Writing a plan for
work someone else called done turns out to be a second audit, which is an
argument for writing them at the time.

## Scope

- `agile/plans/<ID>-plan.md` for each of the five.
- `agile/testing/<ID>-automated.md` for each, naming the test files and what
  they actually assert.
- `agile/testing/<ID>-sweep.md` for each.
- Remove each row from `agile/README.md`'s **Documents outstanding** table as it
  is closed. `tools/record.test.ts` fails on a stale row, so the table cannot
  drift ahead of the work.

## Non-scope

- BUG-001, FEAT-013 and FEAT-015. BUG-001 was fixed inside another item's change
  and has no separate work to plan; FEAT-013 and FEAT-015 are `Partial` and
  their plans belong to the sessions that finish them. All three stay in the
  outstanding table with those reasons.
- Any change to code or tests. If writing a testing document reveals a gap in
  the tests, that gap becomes its own item rather than being filled here.

## Acceptance

- Each of the five items has all four documents.
- Every automated-test document names files and assertions that exist.
- The outstanding table lists only BUG-001, FEAT-013 and FEAT-015.
- `npm test` passes, including `tools/record.test.ts`.

## Dependencies

TASK-012, which built the index and the check this closes against.
