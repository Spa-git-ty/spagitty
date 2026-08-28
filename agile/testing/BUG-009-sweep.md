<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-009 — Manual sweep

**Item:** [`agile/items/BUG-009-message-column-has-no-handle.md`](../items/BUG-009-message-column-has-no-handle.md)

---

## BUG-009-T1 — The message column resizes

**Priority:** high — this is what was reported.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open the Graph screen with the default columns | Commit Message is last and fills the remaining width. |
| 2 | Move the pointer onto its right edge | The cursor becomes a `col-resize` arrow. **This is what was missing.** |
| 3 | Drag left | The column narrows and stops filling. |
| 4 | Drag right | It widens again. |
| 5 | Double-click that divider | It goes back to filling. |
| 6 | Close and reopen the app | The dragged width is remembered, per repository. |

**Result:**

---

## BUG-009-T2 — Every other divider is unchanged

**Priority:** high — the regression risk.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Drag the Branch/Tag column's divider | Works exactly as before. |
| 2 | Hover the Graph column's divider | Still **not** draggable, and its title says it is sized to the lanes. |
| 3 | Compare each divider's line position against a pre-fix build | Unchanged. Only the grab area moved, and only on the last one. |

**Result:**

---

## BUG-009-T3 — Whichever column is last gets the handle

**Priority:** medium — the property, not the instance.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Right-click the header and turn on Author, Date/Time and SHA | They appear; SHA is now last. |
| 2 | Resize SHA from its right edge | It has a grabbable handle. |
| 3 | Resize Commit Message, now in the middle | Still resizable. |
| 4 | Drag columns into a different order | Whichever ends up last is resizable. |
| 5 | Reset the columns | Back to Branch/Tag, Graph, Commit Message, and T1 still holds. |

**Result:**

---

## BUG-009-T4 — Rows follow the header (BUG-003)

**Priority:** high — resizing moves column widths, which is BUG-003's territory.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Resize the message column while watching the rows | Row cells resize with the header, in step. |
| 2 | Check the lane canvas | Stays inside the graph column at every width. |
| 3 | Scroll while a column is narrowed | Header and rows scroll together; nothing drifts. |

**Result:**
