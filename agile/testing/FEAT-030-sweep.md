<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-030 — Manual sweep

**Item:** [`agile/items/FEAT-030-rail-open-repository.md`](../items/FEAT-030-rail-open-repository.md)

The rail is on every screen, and two of its controls moved. The collapsed state
is where the risk is — a container became conditional there.

Tester fills the **Result** column.

---

## FEAT-030-T1 — The top slot

**Priority:** high

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open the application with the rail expanded | The **top** control in the rail is **Open repository…** |
| 2 | Look for the "filter commits" field | Gone. No dashed field, no `⌘F`. |
| 3 | Click Open repository… | The directory picker opens. |
| 4 | Cancel it | Nothing changes. |
| 5 | Look at the bottom of the rail | "Tags N · Submodules N", and **no button** below it. |

**Result:**

---

## FEAT-030-T2 — It reads as the primary action

**Priority:** medium — the point of the move.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Look at Open repository… against the nav items below it | It is filled and clearly the primary action, not another list row. |
| 2 | Check it spans the rail's width | It does, rather than sitting at its own size in a wide slot. |
| 3 | Open the application with **no repository** | It is the obvious thing to press. |
| 4 | Check both themes | Legible in light and dark. |

**Result:**

---

## FEAT-030-T3 — Collapsed

**Priority:** high — this is where the risk is.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Collapse the rail | It narrows to glyphs. |
| 2 | Look at the top | The `⊞` glyph is there, in the same slot the button occupied. |
| 3 | Click it | The directory picker opens. |
| 4 | Hover it | Tooltip reads "Open repository…". |
| 5 | Look at the bottom of the collapsed rail | **No foot** — no counts line squeezed into a rail too narrow for its labels, and no leftover button. |
| 6 | Expand again | The foot returns with its counts; the button returns at the top. |
| 7 | Collapse and expand several times | No flicker, nothing left behind. |

**Result:**

---

## FEAT-030-T4 — Log is still reachable three ways minus one

**Priority:** high — the field was deleted because it was redundant. Confirm it was.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Press `Ctrl+F` from the Graph screen | Lands on Log with the first field focused. |
| 2 | Press `Ctrl+F` from two other screens | Same. |
| 3 | Click the **Log** entry in the rail | Lands on Log. |
| 4 | Confirm the Log screen has its own query bar | It does — this is what made the rail's field a duplicate. |

**Result:**

---

## FEAT-030-T5 — The order

**Priority:** medium

| # | Step | Expected |
| --- | --- | --- |
| 1 | Read the rail top to bottom | Graph, Working copy, Conflicts, Branches, Stash, Pull requests, **Rebase, Log**, divider, All repositories, Settings. |
| 2 | Confirm the divider sits before All repositories | It does. |
| 3 | Visit each entry in turn | Each lands on its own screen, and the active marker follows. |
| 4 | Check the counts still line up | Right-aligned, `·` where not computed. |

**Result:**
