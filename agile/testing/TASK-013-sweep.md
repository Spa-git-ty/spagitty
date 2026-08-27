<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-013 — Manual sweep

**Item:** [`agile/items/TASK-013-backfill-document-sets.md`](../items/TASK-013-backfill-document-sets.md)

This item ships documents. The sweep is a person reading them against the code,
because the only failure mode that matters — a confident sentence that is not
true — is invisible to the check.

---

## TASK-013-T1 — The plans match the code

**Priority:** high.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Read `FEAT-036-plan.md` beside `crates/spagitty-core/src/refs.rs` | The merge is per commit, keyed on the short name; `Host::from_url` reads the authority. |
| 2 | Read `FEAT-038-plan.md` beside `src/lib/graph/actions.ts` | The click is `--ff-only`; the stash/pull/restore ordering is as described. |
| 3 | Read `FEAT-039-plan.md` beside `src/lib/graph/columns.svelte.ts` and `lanes.ts` | The refusal is gone, the catalogue width is `0`, `laneSpanFor` exists. |
| 4 | Read `TASK-011-plan.md` beside `.github/workflows/gates.yml` | The command, the pin, `--redact`, and `detect` rather than `protect`. |
| 5 | Read `FEAT-018-plan.md` beside `shell.rs`, `api.ts` and `Toolbar.svelte` | **The important one.** Confirm for yourself that `--prune` is unconditional, that the buttons send no remote, and that nothing offers `--set-upstream`. |

**Result:**

---

## TASK-013-T2 — Every named test exists

**Priority:** high — an automated-test document that names a test which does not
exist is worse than no document.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Take each test name from the four automated documents and grep for it | Every one is found. |
| 2 | Read three of them | They assert what the document says they assert. |
| 3 | Check the counts quoted from the suite at each landing | They match the commit messages they came from. |

**Result:**

---

## TASK-013-T3 — The record is closed

**Priority:** medium.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open `agile/README.md`'s **Documents outstanding** table | Three rows: BUG-001, FEAT-013, FEAT-015 — each with a reason that is not "TASK-013". |
| 2 | Confirm FEAT-018 reads `Partial` in the index and in the item | Both. |
| 3 | Run `npm test` | Green, including `tools/record.test.ts`. |
| 4 | Delete one of the new plan files and run again | Red, naming the item. Put it back. |

**Result:**
