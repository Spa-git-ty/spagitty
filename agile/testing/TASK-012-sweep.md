<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-012 — Manual sweep

**Item:** [`agile/items/TASK-012-record-drift.md`](../items/TASK-012-record-drift.md)

This item ships no interface. The sweep is a person reading the record, because
the check can only prove that the two halves agree — not that either is true.

---

## TASK-012-T1 — The check fails on drift

**Priority:** high — a check nobody has seen fail is not known to work.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Change one index row's status to a different word | `npm test` fails, naming that identifier. |
| 2 | Put it back; delete an index row | Fails: the item has no row. |
| 3 | Put it back; cite a feature identifier that has no document — `FEAT-` and any unused number — in any sentence under `agile/` or `docs/` | Fails, naming the file that cites it. (Do not leave the citation behind: the check is watching this file too.) |
| 4 | Put it back; write `agile/plans/FEAT-036-plan.md` without touching the README | Fails: the outstanding row is stale. |
| 5 | Put everything back | `npm test` passes. |

**Result:**

---

## TASK-012-T2 — The statuses are true

**Priority:** high — the check cannot do this one.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Read every `Partial` item and find the built half in the tree | FEAT-013: `ops::delete_branch`, `ops::rename_branch`, reachable from the graph's context menu. FEAT-015: `ops::rebase_interactive`, `rebase_run`, and Apply still `disabled`. |
| 2 | Read every `Backlog` item and confirm nothing of it is built | FEAT-016, FEAT-017, FEAT-019, FEAT-033, FEAT-034, TASK-003, TASK-013. |
| 3 | Spot-check five `Done` items against `git log` | Each names a branch or commit that exists. |

**Result:**

---

## TASK-012-T3 — The index reads as a whole

**Priority:** medium — the reason an index exists.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open `agile/README.md` and pick three identifiers at random | Each link opens the right document. |
| 2 | Ask it "what is unfinished?" | The `Partial` and `Backlog` rows answer without opening anything. |
| 3 | Ask it "what is owed?" | The **Documents outstanding** table answers, with a reason per row. |
| 4 | Look up `FEAT-031` | The **Skipped identifiers** table says it was never real, rather than leaving a reader to wonder whether a document is missing. |

**Result:**
