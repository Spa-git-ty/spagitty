<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-046 — Manual sweep

**Item:** [`agile/items/FEAT-046-graph-squeeze-keeps-the-portraits.md`](../items/FEAT-046-graph-squeeze-keeps-the-portraits.md)

---

## FEAT-046-T1 — The portraits do not follow the drag

**Priority:** high — the item.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open a repository with a few branches and note a face at the top of the graph | Full-size portrait, as always. |
| 2 | Drag the graph column's divider left, slowly | The lanes fold together. The face does not change size at any point in the drag. |
| 3 | Drag to the narrowest width the column allows | Same diameter as at step 1. Compare against the screencast. |
| 4 | Drag back out to full width | Nothing pops or resizes on the way back. |
| 5 | Do the same at 130% and 200% zoom | The portrait scales with the zoom and with nothing else. |

**Result:**

---

## FEAT-046-T2 — A deep history still compresses

**Priority:** high — the behaviour this must not break.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open a repository whose graph reaches past twelve lanes, or scroll to a region that does | The nodes are visibly smaller than in an ordinary repository. |
| 2 | Drag the column narrower | The nodes stay the size the *depth* set. They do not shrink further with the drag. |
| 3 | Scroll to a shallow region of the same repository | The nodes come back to full size, once the shrink delay passes. |
| 4 | Scroll back into the deep region | They shrink again, immediately. |

**Result:**

---

## FEAT-046-T3 — What the fold actually looks like

**Priority:** high — the judgement the tests cannot make.

| # | Step | Expected |
| --- | --- | --- |
| 1 | With four or five branches on screen, drag the column to about half its width | The lanes are visibly closer than the faces are wide, and pass behind them. |
| 2 | Keep dragging to the narrowest width | The nodes stack towards one x, still whole, still drawn on top of the lines. |
| 3 | Look at two adjacent rows on different lanes | Decide whether the overlapping faces still read as two people, or as a pile. |
| 4 | Check the merge dots among them | Still findable; they did not disappear behind a portrait. |
| 5 | Record the answer | If it is too dense, the next move is the node's z-order or a fade, not putting the shrink back. |

**Result:**

---

## FEAT-046-T4 — Node and lane still line up

**Priority:** high — BUG-003 is what happens when they do not.

| # | Step | Expected |
| --- | --- | --- |
| 1 | At full width, look where a lane line meets a node | The line runs into the centre of the face, not past its edge. |
| 2 | Drag the column narrower, one pixel at a time near the middle | The line and the node stay together at every width. |
| 3 | Repeat at 110%, 135% and 200% zoom | Still together; no half-pixel offset appears. |
| 4 | Check the rightmost lane at the narrowest width | Its portrait is inside the column. Nothing overlaps the message column or the divider. |
| 5 | Scroll fast through a busy region | No lane leaves the column at any frame. |

**Result:**

---

## FEAT-046-T5 — A shallow repository is not squeezed early

**Priority:** medium.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open a repository with one or two lanes | Two lanes at the design spacing. |
| 2 | Drag the column narrower until the lanes visibly close up | They hold the design spacing until the column genuinely cannot fit two lanes — not from the first pixel dragged. |
| 3 | Open the Graph screen fresh on that repository | No moment of compressed lanes before it settles: the first frame is already right. |
| 4 | Switch between a shallow and a deep repository through the tabs | Each is laid out for its own depth, without carrying the other's. |

**Result:**
