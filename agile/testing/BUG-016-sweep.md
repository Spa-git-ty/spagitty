<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-016 — Manual sweep

**Item:** [`agile/items/BUG-016-graph-columns-stop-at-the-last-row.md`](../items/BUG-016-graph-columns-stop-at-the-last-row.md)

**Preconditions for every ticket:** a build of
`bugfix/BUG-016-graph-columns-stop-at-the-last-row`, and two repositories to
hand — a **short** one with about five commits, and a **long** one with more
commits than the window can show. A freshly `git init`-ed directory with no
commits at all is needed for T2.

---

## BUG-016-T1 — The reported failure is gone

**Priority:** high — this is the report.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open the short repository on the Graph screen | The commits list from the top. |
| 2 | Make the window tall enough that the commits fill less than half of it | There is empty table below the last row. |
| 3 | Look at that empty area | The graph band and the vertical rule on each side of it carry on to the bottom of the table, meeting the status strip. No rows in them. |
| 4 | Look at the boundary where the last commit ends | The band is one continuous colour through it — no seam, no step, no change of shade between the part under the rows and the part under nothing. |

**Result:**

---

## BUG-016-T2 — A repository with no commits at all

**Priority:** high — the empty case is what the fix is for.

| # | Step | Expected |
| --- | --- | --- |
| 1 | `git init` an empty directory and open it | The Graph screen opens with no commits. |
| 2 | Look at the table | The columns are drawn for the full height. The header and the body agree about how many columns there are. |
| 3 | Confirm nothing else appeared | No row, no stripe, no lane node — an empty repository still has nothing in it. |

**Result:**

---

## BUG-016-T3 — The band follows the columns

**Priority:** high — the fault this replaced (BUG-003) was a layer that did not.

| # | Step | Expected |
| --- | --- | --- |
| 1 | On the short repository, drag the divider between Branch/Tag and Graph to make Branch/Tag much wider | The band moves right with it, over the full height — the part under the rows and the part under nothing move together. |
| 2 | Drag it much narrower | Same, in the other direction. |
| 3 | Drag the Graph column header to the far left, so it is first | The band is now the leftmost column, full height. |
| 4 | Right-click the header and hide a column, then show it again | The band is where the header says it is, both times. |

**Result:**

---

## BUG-016-T4 — Scrolling, sideways and down

**Priority:** medium — the bed is translated by the scroll offset, like the rows.

| # | Step | Expected |
| --- | --- | --- |
| 1 | On the short repository, widen the columns until the table is wider than the window, then scroll sideways | The band stays lined up with the header and the rows at every scroll position, including the empty part below the rows. |
| 2 | On the long repository, scroll down to the end of the history | Where the commits run out — if they do — the band carries on to the bottom exactly as on the short repository. |
| 3 | Scroll back to the top quickly | Nothing lags behind or tears. |

**Result:**

---

## BUG-016-T5 — Nothing that worked before has changed

**Priority:** high — the bed sits under the rows and must stay under them.

| # | Step | Expected |
| --- | --- | --- |
| 1 | On the long repository, move the pointer down the list | The hover tint appears on the row under the pointer, across its whole width, exactly as before. |
| 2 | Click a commit | The selection gradient runs the full width of the row and the lanes stay legible through it. |
| 3 | Look at the alternating row stripe | Unchanged, and it still stops at the last row — a stripe with no row in it would be wrong. |
| 4 | Right-click a commit | The context menu opens and every entry works. Nothing is covered by an invisible layer. |
| 5 | Select a row, then use the up and down arrows | Selection moves, and the lane canvas stays drawn over the band rather than under it. |

**Result:**

---

## BUG-016-T6 — At a different interface scale

**Priority:** medium — the band is sized from the same metrics as the rows.

| # | Step | Expected |
| --- | --- | --- |
| 1 | On the short repository, press Ctrl and `=` several times to zoom the interface in | The band widens with the lane column and still reaches the bottom. |
| 2 | Ctrl and `-` back down, past 100% if it goes there | Same, at every step. |
| 3 | Ctrl and `0` to reset | Back to where it started, still full height. |

**Result:**
