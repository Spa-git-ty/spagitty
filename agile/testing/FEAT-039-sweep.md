<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-039 — Manual sweep

**Item:** [`agile/items/FEAT-039-resizable-graph-column.md`](../items/FEAT-039-resizable-graph-column.md)

*Backfilled by TASK-013.*

---

## FEAT-039-T1 — The graph column drags

**Priority:** high — the item.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open the Graph screen and hover the graph column's divider | A `col-resize` cursor, and a title that names the graph column. |
| 2 | Drag it narrower | The column narrows and the lanes reflow **as you drag**, not on release. |
| 3 | Keep going to the minimum | It stops at a column still wide enough to draw in; it never collapses to nothing. |
| 4 | Drag it wider | The lanes spread back out and stop at their design pitch. |
| 5 | Double-click the divider | The column goes back to sizing itself to the lanes. |
| 6 | Close and reopen the app | The dragged width is remembered, per repository. |

**Result:**

---

## FEAT-039-T2 — Undragged, nothing changed

**Priority:** high — the regression risk for every existing user.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open a repository never dragged in this app | The graph column is exactly as wide as its lane count says. |
| 2 | Switch to a repository with more branches | It grows with the lane count, as before. |
| 3 | Compare against a pre-change build, side by side | Identical. |
| 4 | Check that the column cannot be hidden from the header menu | It is required; there is no way to turn it off. |

**Result:**

---

## FEAT-039-T3 — A compressed graph is still a graph

**Priority:** high — the arithmetic cannot answer this.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open a history with many concurrent branches and narrow the column to its minimum | Every lane still has its own x; nothing is drawn on top of anything. |
| 2 | Follow one branch up the screen | It can be followed. If it cannot, that is the finding — record where it stops being readable. |
| 3 | Check the nodes | Smaller, in step with the pitch. |
| 4 | Change the zoom at each width | Same behaviour at every zoom; the column holds the same lanes. |

**Result:**

---

## FEAT-039-T4 — Alignment (BUG-003 territory)

**Priority:** high.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Drag the column while watching a commit's node and its row | Node and row stay aligned at every width. |
| 2 | Check the lane canvas edges | Nothing paints outside the graph column, into the message column or the chips. |
| 3 | Scroll while narrowed | Canvas and rows scroll together; nothing drifts. |
| 4 | Resize the window with a narrowed graph column | The chosen width is kept; the message column absorbs the change. |

**Result:**

---

## FEAT-039-T5 — Every divider has a job

**Priority:** medium — the state this item deleted.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Hover every divider in the header | All of them offer a resize; none is inert or greyed. |
| 2 | Read each title | Each names the column it sizes — its own. |
| 3 | Drag each | Each sizes its own column, dragging right to widen. **No inverted drag anywhere.** |

**Result:**
