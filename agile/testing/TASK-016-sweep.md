<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-016 — Manual sweep

**Item:** [`agile/items/TASK-016-one-branch-carried-fifteen-items.md`](../items/TASK-016-one-branch-carried-fifteen-items.md)

**Preconditions for every ticket:** a checkout of the repository with the
`feature/FEAT-019-commit-signing` branch present, and a terminal. Every ticket
checks the table against `git`, never against itself.

---

## TASK-016-T1 — A sample of rows is right

**Priority:** high — a plausible table that is wrong is worse than no table.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Pick five rows at random from the table in the item | |
| 2 | For each, run `git show --stat <commit>` | The files touched belong to that item — its screen, its module, its record documents. |
| 3 | For each, read the commit subject | It names the item, or the row says why it does not. |
| 4 | Run `git log --oneline 76b6dbc..356142f \| wc -l` | 45, the number the item claims. |

**Result:**

---

## TASK-016-T2 — The four unrecorded commits really have no item

**Priority:** high — this is the gap the item claims to have found, and claiming a gap that is not there is its own defect.

| # | Step | Expected |
| --- | --- | --- |
| 1 | `git show --stat 02d5d9d d3d2807 444f5fe 01fca90` | Release workflow, a tag deletion, and a manifest URL. |
| 2 | `grep -rn "02d5d9d\|d3d2807\|444f5fe\|01fca90" agile/` | Nothing outside TASK-016's own documents. |
| 3 | Search `agile/items/` for anything covering the draft release workflow | No item. The gap is real. |
| 4 | Confirm the item says so rather than implying the table is complete | It names all four. |

**Result:**

---

## TASK-016-T3 — Nothing was rewritten

**Priority:** high — the plan's central promise.

| # | Step | Expected |
| --- | --- | --- |
| 1 | `git log --oneline -1 feature/FEAT-019-commit-signing` | `356142f`, unchanged. |
| 2 | `git reflog` on that branch | No rebase, no reset, no amend since this item's work began. |
| 3 | `git branch -a` | Every branch that existed before is still there. |
| 4 | Compare `origin/feature/FEAT-019-commit-signing` with the local branch | The remote is behind, not divergent — nothing was rewritten under it. |

**Result:**

---

## TASK-016-T4 — The new branches actually follow the rule

**Priority:** medium — the item claims the rule is demonstrated, not just written.

| # | Step | Expected |
| --- | --- | --- |
| 1 | List them with `git branch --list --no-merged 356142f`, then for each run `git log --oneline 356142f..<branch>` | One or two commits, all belonging to that one item. |
| 2 | Check none contains another's commits | `git log --oneline <a>..<b>` shows only b's own work. |
| 3 | Check each branch name against its item's identifier and Amendment 13's prefixes | `feature/`, `bugfix/`, `task/` only, `FEAT-###` / `BUG-###` / `TASK-###` in uppercase. |
| 4 | Confirm each has its four record documents | Item, plan, automated, sweep. |

**Result:**

---

## TASK-016-T5 — The record test still refuses a dangling identifier

**Priority:** low — the guard this whole class of problem depends on.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Write a feature identifier that has never been assigned — `FEAT-` and a number well past the highest in the index — into any sentence of the TASK-016 item | |
| 2 | Run `npx vitest run tools/record.test.ts` | **Red**, naming that identifier as cited with no item document. |
| 3 | Undo the edit and re-run | Green. |
| 4 | Now put the same invented identifier in a source comment under `src/` instead, and re-run | **Green** — and that is the hole. The test reads `agile/` and `docs/` only, which is how an identifier was spent in a comment twice. Note it; do not fix it here. |

**Result:**
