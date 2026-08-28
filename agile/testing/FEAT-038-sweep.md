<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-038 — Manual sweep

**Item:** [`agile/items/FEAT-038-pull.md`](../items/FEAT-038-pull.md)

*Backfilled by TASK-013. Run this against a scratch repository with a remote you
can push to — several steps write history.*

---

## FEAT-038-T1 — Pull exists, and pulls

**Priority:** high — the item.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Look at the toolbar | A Pull button, beside Fetch and Push. |
| 2 | Push a commit from elsewhere, then click Pull on a clean working copy | It pulls without asking; the graph shows the new commit. |
| 3 | Watch what it wrote | A fast-forward. No merge commit. |
| 4 | Click Pull with nothing to pull | It says so and does nothing. |

**Result:**

---

## FEAT-038-T2 — The click cannot go wrong

**Priority:** high — why a single click is safe.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Commit locally, and push a different commit from elsewhere, so the branches diverge | |
| 2 | Click Pull | It refuses, and says the branch has diverged. **No merge commit is written.** |
| 3 | Check `git log` | Unchanged. |
| 4 | Right-click Pull | Merge and rebase are offered; rebase is marked destructive. |
| 5 | Choose merge | It merges, and the graph shows the merge commit. |

**Result:**

---

## FEAT-038-T3 — A pull that stops in a conflict

**Priority:** high — the messy case.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Arrange the same line changed on both sides; right-click → merge | The pull stops; git's message is shown. |
| 2 | Open the Conflicts screen | The conflicted files are listed. |
| 3 | Resolve outside the app and continue | The app re-reads and shows the finished state. |
| 4 | Repeat with rebase | The destructive warning appears first. |

**Result:**

---

## FEAT-038-T4 — Uncommitted work

**Priority:** high — this is where work could be lost.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Edit two files; click Pull | The confirmation names **two changes** and offers to stash, pull, restore. |
| 2 | Accept | The changes go, the pull runs, the changes come back. `git stash list` is empty afterwards. |
| 3 | Repeat with one file edited | It says "change", not "changes". |
| 4 | Decline | Nothing is stashed and nothing is pulled. |
| 5 | Force the pull to fail (diverge the branch, choose `--ff-only`) with changes stashed | The changes stay in the stash, and the message says so — **not** restored on top of a half-finished pull. |
| 6 | Recover the stash by hand | `git stash pop` returns exactly what was edited. |

**Result:**

---

## FEAT-038-T5 — The toolbar is centred

**Priority:** medium — the second half of the commit.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Look at the toolbar in a maximised window | The actions sit in the middle of the **window**, not of the space left over. |
| 2 | Narrow the window | They stay centred. |
| 3 | Open a repository with a very long name | The pickers grow; the actions do not shift. |
| 4 | Compare against a pre-fix build | The group has moved left, by half the pickers' width. |

**Result:**
