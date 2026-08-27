<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-021 — Manual sweep

**Item:** [`agile/items/TASK-021-centre-the-name-in-the-title-bar.md`](../items/TASK-021-centre-the-name-in-the-title-bar.md)

**Preconditions:** a build of the branch, on a desktop where the window can be
resized freely.

---

## TASK-021-T1 — It is centred on the window

**Priority:** high — this is the request, and "centred" is the whole of it.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open the application and look at the title bar | `Spagitty` sits in the middle of the **window**. |
| 2 | Check it against the middle rather than by eye — the middle of the tab row below, or a maximised window against the screen's centre | On the centre line, not left of it by roughly the width of the three window controls. |
| 3 | Maximise the window | Still centred. |
| 4 | Restore it | Still centred. |

**Result:**

---

## TASK-021-T2 — It stays centred while resizing

**Priority:** high — a layout that is centred at one width and not another is not centred.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Drag the window's right edge slowly wider and narrower | The name tracks the middle continuously. No jump, no drift. |
| 2 | Make the window as narrow as it will go | Still centred, or ellipsised from the middle outward — **not** shoved left by the controls. |
| 3 | Make it very wide | Still centred. |

**Result:**

---

## TASK-021-T3 — The bar still behaves like a title bar

**Priority:** high — the name moved into the middle of the drag region.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Drag the window by an empty part of the bar | The window moves. |
| 2 | Drag the window **by the name itself** | The window moves. The name is text, not a control, and must not swallow the drag. |
| 3 | Double-click the bar | Maximises; double-click again restores. |
| 4 | Double-click the name | Same. |
| 5 | Click each of minimize, maximize and close | Each does its own job, and none of them drags the window. |

**Result:**

---

## TASK-021-T4 — The controls are where they were

**Priority:** medium — they moved into a grid column.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Look at the right end of the bar | The three controls hard against the right edge, evenly spaced, in the same order. |
| 2 | Resize the window | They stay against the right edge at every width. |
| 3 | Hover each | The same hover treatment as before, and the close button still colourless. |

**Result:**
