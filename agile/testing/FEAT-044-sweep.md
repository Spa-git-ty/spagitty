<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-044 — Manual sweep

**Item:** [`agile/items/FEAT-044-repo-tabs-own-row.md`](../items/FEAT-044-repo-tabs-own-row.md)

---

## FEAT-044-T1 — The row is where the tabs are

**Priority:** high — the item.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open two repositories | A row of tabs below the title bar and above the toolbar. |
| 2 | Look at the title bar | The program name and the window controls. No tabs, no `All repositories`. |
| 3 | Click the inactive tab | It switches, exactly as before: the screen and selection it was left on come back. |
| 4 | Close a tab with its ✕ | Closes; the other becomes active. |
| 5 | Click `+` | The open/clone/reopen menu, as before. |
| 6 | Reach All repositories | From the rail, one click. |

**Result:**

---

## FEAT-044-T2 — The row looks like a row

**Priority:** high.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Look at the active tab | It sits on the row's bottom boundary, rounded at the top, with its accent underline reading as part of that boundary. |
| 2 | Hover an inactive tab | Fills, without moving. |
| 3 | Open six or seven repositories | The tabs stay one row and scroll sideways rather than wrapping or squeezing to nothing. |
| 4 | Narrow the window | The title bar's contents no longer fight the tabs for the same row. |
| 5 | Switch themes | The row reads in both; its bottom border is the same weight as the title bar's. |

**Result:**

---

## FEAT-044-T3 — The empty case

**Priority:** high — an empty band is the failure this design avoids.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Close every repository | The tab row **disappears**; the title bar sits directly on the toolbar. |
| 2 | Confirm the window has no empty band across it | None. |
| 3 | Open a repository from the rail | The row appears with one tab in it. |
| 4 | Close it again | The row goes. |

**Result:**

---

## FEAT-044-T4 — How much chrome is this now

**Priority:** medium — a judgement the tests cannot make.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open a repository and count the horizontal bands: title bar, tabs, toolbar, screen, status strip | Decide whether the top of the window has become too heavy. |
| 2 | Compare against a build from before this item | The tabs have moved out of a crowded row into a quiet one; is the trade worth it? |
| 3 | Record the answer | If it is too much, the next move is which row absorbs which — not putting the tabs back. |

**Result:**
