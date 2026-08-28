<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-042 — Manual sweep

**Item:** [`agile/items/FEAT-042-tighter-corners-and-a-round-cast.md`](../items/FEAT-042-tighter-corners-and-a-round-cast.md)

Run this against a build of the previous commit as well — three of the four
checks are comparisons.

---

## FEAT-042-T1 — The cast shadow follows the window

**Priority:** high — the half of the request that is a defect rather than a
taste.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Restore the window (not maximized) on a light desktop | The soft shadow under it has the **same corner curve** as the window. |
| 2 | Look at each of the four corners in turn | No corner where the shadow reads squarer than the frame. |
| 3 | Compare against the previous build, side by side | The shadow's weight looks the same; only its corners changed. |
| 4 | Switch to dark and repeat | The same, against a dark desktop. |
| 5 | Maximize | Square, no cast, sheen only. |

**Result:**

---

## FEAT-042-T2 — Every corner is tighter, and still a scale

**Priority:** high — the other half of the request.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Look at a field, a panel, a button and the window together | Everything is visibly tighter than the previous build. |
| 2 | Check the order | Button still rounder than panel; window still at least as round as a panel; field the tightest. |
| 3 | Find a pill chip | Unchanged — still fully round. |
| 4 | Open a menu, a dialog, the palette and a notice | All tighter, none square, none inconsistent with the panels behind them. |

**Result:**

---

## FEAT-042-T3 — Zoom and first paint

**Priority:** high — this is where two copies of a number show themselves.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Watch the window closely as the app starts | The corners do **not** jump between the first paint and the first frame after it. |
| 2 | Zoom in two steps | Radii grow proportionally; nothing keeps a 4px corner on a box twice the size. |
| 3 | Zoom out two steps | They shrink again; nothing collapses to square. |
| 4 | Reset the zoom | Back to the design's own numbers. |
| 5 | Change the text scale without changing zoom | Radii do not move — they follow zoom, not type. |

**Result:**

---

## FEAT-042-T4 — Nothing else moved

**Priority:** medium.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Look at the window's inner sheen and the tight contact shadow under it | Unchanged; FEAT-037's depth is intact. |
| 2 | Open a right-click menu over the graph | Its own shadow is unchanged. |
| 3 | Check the repository tabs, whose top corners are rounded and bottom are not | Still square at the bottom, tighter at the top. |
| 4 | Look at a commit row's hover and selection fill | Tighter, and still aligned with the row's edges. |

**Result:**
