<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-009b — Manual sweep

**Item:** [`agile/items/BUG-009b-graph-divider-resizes-message.md`](../items/BUG-009b-graph-divider-resizes-message.md)

---

## BUG-009b-T1 — The Graph | Commit Message boundary sizes the message column

**Priority:** high — this is what was reported.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open the Graph screen with the default columns | Branch/Tag, Graph, Commit Message; the message column fills. |
| 2 | Hover the boundary between Graph and Commit Message | `col-resize` cursor, and the title says it resizes **Commit Message**. |
| 3 | Drag right | The boundary follows the pointer and the message column gets narrower. |
| 4 | Drag left | The boundary follows back and the message column widens. |
| 5 | Double-click that divider | The message column goes back to filling. |
| 6 | Close and reopen the app | The dragged width is remembered, per repository. |

**Result:**

---

## BUG-009b-T2 — Ordinary dividers are unchanged

**Priority:** high — the regression risk.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Drag the Branch/Tag divider | Sizes Branch/Tag, dragging right to widen — as before. |
| 2 | Read its title | Names Branch/Tag. |
| 3 | Turn on Author, Date/Time and SHA from the header menu | All of them resize their own column, in the ordinary direction. |
| 4 | Compare each divider's drawn line against a pre-fix build | Unchanged — only what the handle does changed, not where it is. |

**Result:**

---

## BUG-009b-T3 — The graph column still follows the lanes

**Priority:** high — the divider now moves a neighbour, and must not move this.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open a repository with several concurrent branches | The graph column is as wide as the lanes need. |
| 2 | Drag the Graph \| Commit Message boundary left and right | The graph column's own width never changes; only the message column does. |
| 3 | Check the lane canvas and the nodes while dragging | Stay inside the graph column, aligned with their rows. |
| 4 | Switch to a repository with more lanes | The graph column re-computes; the message width the user set is kept. |

**Result:**

---

## BUG-009b-T4 — A divider with nothing to size still says so

**Priority:** medium — the fallback.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Hide every column after Graph from the header menu | Graph is last. |
| 2 | Hover its divider | Marked fixed, no `col-resize`, and the title says the graph column is sized to the lanes. |
| 3 | Drag it | Nothing happens; no column changes width. |
| 4 | Show Commit Message again | The divider is live again and sizes Commit Message. |

**Result:**

---

## BUG-009b-T5 — Rows follow the header (BUG-003)

**Priority:** high — a resize moves column widths, which is BUG-003's territory.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Drag the boundary while watching the rows | Row cells resize with the header, in step. |
| 2 | Narrow the message column until messages elide | Ellipsis, no overflow into the next column. |
| 3 | Scroll the table sideways with a narrowed column | Header and rows scroll together; nothing drifts. |

**Result:**
