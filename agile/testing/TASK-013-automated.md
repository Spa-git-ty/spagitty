<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-013 — Automated tests

**Item:** [`agile/items/TASK-013-backfill-document-sets.md`](../items/TASK-013-backfill-document-sets.md)
**File:** `tools/record.test.ts` — TASK-012's check, which this item is measured
by rather than adding to.

## What the check proves about this work

| Assertion | What it means here |
| --- | --- |
| built items have all four documents, or a declared debt | the five sets exist — nothing was "closed" by editing the table |
| no stale row in the outstanding table | the table now lists only BUG-001, FEAT-013 and FEAT-015, and it lists them because those documents genuinely do not exist |
| index status equals the item's status | FEAT-018's correction to `Partial` reached both places |
| every cited identifier resolves | the new documents cite FEAT-016, FEAT-033, TASK-010 and others, and every one of them resolves |

It ran red twice during the work, both times on a debt row left behind after its
documents were written. That is the check doing the job it was built for.

## What no test can prove

That a backfilled document is **true**. The check asserts joins; it cannot read
a plan and know whether the reasoning in it was the reasoning at the time. The
mitigations are editorial, not automated: every document says it is backfilled,
commit messages are quoted rather than paraphrased where they carry the
argument, and anything unrecoverable is written as unknown.

The one place this was tested by hand is FEAT-018, where writing the plan
required reading the code and the reading contradicted the record. Whoever
reviews this should read that plan against `shell.rs` and `actions.ts`
themselves.

## Suite at the time

1282 tests across 56 files, all passing; `npm run check` clean over 991 files;
all four coverage metrics over the floor. This item adds no code and moves no
metric.
