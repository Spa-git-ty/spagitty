<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-012 — Automated tests

**Item:** [`agile/items/TASK-012-record-drift.md`](../items/TASK-012-record-drift.md)
**File:** `tools/record.test.ts` — 198 tests (six assertions, plus one per
markdown file under `agile/` and `docs/`), all passing.

## What is asserted

| Block | Asserts |
| --- | --- |
| the index covers the tree | every item document has exactly one index row |
| | every row points at a document that exists, by name |
| | no identifier appears twice across the index and the skipped table |
| statuses | every status is one of `Done`, `Fixed`, `Partial`, `Open`, `Backlog` |
| | the index's status and the item's `**Status:**` line agree |
| four documents | a `Done`, `Fixed` or `Partial` item has plan, automated and sweep — or the exact missing set is declared under **Documents outstanding** |
| | no stale row: a declared debt must match what is actually missing |
| | a `Backlog` item owes nothing and must not be listed as a debt |
| citations | every `FEAT-`, `TASK-` or `BUG-` identifier in each file under `agile/` or `docs/` resolves to an item document or a skipped-identifier row |

The citation block is `it.each` over the files rather than one assertion over all
of them, so a failure names the file that cites the dangling identifier instead
of a list to grep for.

## What is deliberately not asserted

- **Anything about prose.** No document is required to contain a section, a
  heading, or a form of words. The record is checked as a set of joins; the
  writing is the writer's.
- **That a status is true.** No test can read the tree and decide whether
  FEAT-013 is really `Partial`. What is checked is that the item and the index
  say the same thing, so the two places a reader looks cannot disagree.
- **Branch names.** Several items shipped on another item's branch, honestly
  recorded, so a branch-per-item assertion would fail on the truth.

## Coverage

Coverage counts `src/lib/**` only, per Amendment 10, so this file adds none and
moves no metric. Suite total after the change: 1282 tests across 56 files.

## Not covered here

Nothing in the sweep is a UI check — this item ships no interface. The sweep is
a read of the rebuilt record by a person, which is the only thing that can
notice a row that is *well-formed and wrong*.
