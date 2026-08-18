<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-043 — Manual sweep

**Item:** [`agile/items/FEAT-043-app-status-strip.md`](../items/FEAT-043-app-status-strip.md)

---

## FEAT-043-T1 — The identity moved, and moved once

**Priority:** high — the item.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open the app | `GPL-3.0 · v0.1.0` at the bottom right. |
| 2 | Look at the title bar | It is not there. |
| 3 | Search the window for a second copy | There is none outside Settings → About, which shows the full licence and the exact commit and is meant to. |
| 4 | Hover the strip's text | `GPL-3.0-or-later`. |
| 5 | Check the title bar's tabs and window controls | In the same places as before. |

**Result:**

---

## FEAT-043-T2 — It is the window's edge

**Priority:** high — where the strip is mounted is the whole design.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Look at the strip's left end | It runs under the nav rail, not just under the screen. |
| 2 | Collapse the rail | The strip is unbroken across the full width. |
| 3 | Look at the bottom corners | Rounded, with the strip clipped to them — the window's corner is not squared off. |
| 4 | Maximize | Square bottom corners, strip still full width. |
| 5 | Scroll a long screen to its end | The strip does not move and nothing scrolls over it. |

**Result:**

---

## FEAT-043-T3 — Every screen, every state, every scale

**Priority:** medium.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Visit every screen in the rail | The strip is on all of them, unchanged. |
| 2 | Close every repository | Still there, still correct — it is the build's identity, not the repository's. |
| 3 | Zoom in and out two steps each way | The strip's height follows the rest of the chrome; the text stays on one line. |
| 4 | Switch themes | Muted text on the panel colour in both; the hairline above it reads in both. |
| 5 | Make the window very narrow | The identity stays on one line and is not clipped. |

**Result:**

---

## FEAT-043-T4 — Two bars, or one edge

**Priority:** medium — the thing most likely to look wrong.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open the Graph screen, which draws its own footer | Decide, looking at it: does the screen footer sitting directly on the strip read as two bars? |
| 2 | Compare with a screen that has no footer | The strip alone should look intentional. |
| 3 | Record the answer | If it reads as confused, that is input to FEAT-040, which rewrites the graph's footer — not a defect in this item. |

**Result:**
