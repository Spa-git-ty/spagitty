<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-045 — Manual sweep

**Item:** [`agile/items/FEAT-045-toolbar-repo-and-branch.md`](../items/FEAT-045-toolbar-repo-and-branch.md)

---

## FEAT-045-T1 — The line reads as a location

**Priority:** high — the item.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open a repository | The toolbar's left reads `name › branch ▾`. |
| 2 | Point at the name | No hover fill, no pointer cursor, nothing to click. Its tooltip is the repository's path. |
| 3 | Click the name | Nothing happens. All repositories is still one click away on the rail. |
| 4 | Close every repository | The line reads `no repository`, quietly, and no branch control is drawn. |
| 5 | Check out a detached HEAD, then look | The control shows the short commit id rather than a name. |

**Result:**

---

## FEAT-045-T2 — The dropdown is a dropdown

**Priority:** high.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Click the branch control | A list opens **under** the control, not at the pointer and not over it. |
| 2 | Reach the control by keyboard and press Enter | The list opens in the same place a click puts it. |
| 3 | Press Escape, then click outside | Each closes the list. |
| 4 | Move with the arrow keys | The selection moves; the disabled current branch is skipped or announces its reason. |
| 5 | Open it near the window's right or bottom edge | The list stays inside the window. |
| 6 | Open it on a repository with many branches | It scrolls rather than growing past the window. |

**Result:**

---

## FEAT-045-T3 — Checking out, and the window following

**Priority:** high — this is a write started one click from every screen.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open the list on a clean working copy | Local branches only. No `origin/…` entries anywhere in it. |
| 2 | Look at the branch you are on | Listed, disabled, with `already on it`. Not hidden, not chooseable. |
| 3 | Choose another branch | It checks out. The list closes. |
| 4 | Look at the whole window | The control names the new branch, and the graph, the branches table and the status strip all show it too. |
| 5 | Open the command log | The `git checkout` appears there like any other write. |

**Result:**

---

## FEAT-045-T4 — What a refusal looks like

**Priority:** high — the failure mode the item names.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Edit a tracked file without committing, in a way the target branch also changes | A dirty working copy that git will refuse to switch. |
| 2 | Choose the other branch from the dropdown | It refuses. |
| 3 | Read the toolbar | Git's sentence sits beside the control — `your local changes would be overwritten` or whatever git actually said. Not a code, not silence. |
| 4 | Check whether the message is readable | It truncates rather than pushing the action buttons off centre; the full text is in its tooltip. Judge whether the truncated form still says enough. |
| 5 | Look at the control | It names the branch you are **still on**. Nothing is half-switched. |
| 6 | Commit or stash, then choose again | It succeeds, and the message goes. |

**Result:**

---

## FEAT-045-T5 — The list is read when it is needed

**Priority:** medium.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open a repository and watch the command log without touching the toolbar | No branch read happens for the toolbar's sake. |
| 2 | Open the dropdown for the first time | The read happens now; `reading branches…` shows for the moment before rows arrive. |
| 3 | Open the Branches screen, then the dropdown | One read, not two racing. The list matches the screen. |
| 4 | Create a branch on the Branches screen, then reopen the dropdown | The new branch is in it. |

**Result:**
