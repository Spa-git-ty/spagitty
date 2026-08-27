<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-035 — Manual sweep

**Item:** [`agile/items/FEAT-035-lane-overflow-compression.md`](../items/FEAT-035-lane-overflow-compression.md)

The arithmetic is asserted. What no headless test can answer is whether a
compressed graph is still *readable*, and that is the question this item lives
or dies on.

**A repository with more than twelve concurrent lanes is required.** `git/git`
and `cli/cli` both qualify; so does any repository with many long-lived
branches. Without one, only T1 and T7 can be run.

Tester fills the **Result** column.

---

## FEAT-035-T1 — Ordinary repositories are untouched

**Priority:** high — this is the regression risk that affects everybody.
**Preconditions:** a repository with five or fewer concurrent lanes.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open the Graph screen | Lanes render as before. |
| 2 | Compare lane spacing against a build from before this change | **Identical.** Nothing about a shallow history moved. |
| 3 | Look at the commit nodes | Full-size portraits, same as before. |
| 4 | Check the lane column's width | Unchanged at the design width. |

**Result:**

---

## FEAT-035-T2 — The reported defect is gone

**Priority:** high
**Preconditions:** a repository reaching more than twelve concurrent lanes.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Scroll to a region with more than twelve lanes | The graph draws. |
| 2 | Count the distinct vertical lines | Every lane has its **own** line. None sits exactly on top of another. |
| 3 | Compare against the screenshot in the request | The stacking behaviour is gone. |
| 4 | Look at the right edge of the lane column | Lanes stop before the divider. **Nothing is drawn under or behind the message column.** |
| 5 | Follow one lane up and down through the region | It stays a single continuous line and does not jump sideways between rows. |

**Result:**

---

## FEAT-035-T3 — Is it actually readable?

**Priority:** high — **the ticket most likely to send this item back.**

The whole point is a graph you can read. If compression produces a smear, say so
plainly here; the fallback is a different design decision and the author's call,
not a tweak.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Find a region with roughly 15 lanes | Lanes are visibly separate. Colours are tellable apart. |
| 2 | Find a region with roughly 25 lanes | Still separate. Tighter, but two lines rather than a band. |
| 3 | Find a region with roughly 40 lanes, if the repository has one | Judge honestly whether this is still a graph or a smear. |
| 4 | Trace one branch from its start to its merge in each region | Possible without losing it. |
| 5 | Record the lane count at which it stops being useful | A number, for the author. |

**Result:**

---

## FEAT-035-T4 — Nodes on a compressed column

**Priority:** high

| # | Step | Expected |
| --- | --- | --- |
| 1 | In a 15-lane region, look at the commit nodes | Smaller than in a shallow history — deliberately. Still recognisable as faces. |
| 2 | Check a node against the lane beside it | The portrait does not cover the neighbouring lane's line. |
| 3 | In a 20-lane region | Nodes smaller again; still not covering neighbours. |
| 4 | Past about 32 lanes, if reachable | Nodes **do** begin to overlap the neighbouring lane. **Expected** — the node is held at its minimum rather than shrinking out of sight. Note whether it is tolerable. |
| 5 | Look at merge dots in a compressed region | Still distinguishable from commit nodes. |
| 6 | Scroll quickly through varying depth | Node size changes with depth without flicker or visible redraw stutter. |

**Result:**

---

## FEAT-035-T5 — Lanes and rows still agree (BUG-003)

**Priority:** high — this is the defect this change could resurrect.

| # | Step | Expected |
| --- | --- | --- |
| 1 | In a compressed region, check each commit's node against its row | The node is vertically centred on **its own** row, not between two. |
| 2 | Scroll rapidly up and down | Lanes and rows stay locked together. The canvas never lags the rows. |
| 3 | Drag the Branch/Tag column's divider wider and narrower | The lane canvas stays inside its column at every width. |
| 4 | Drag the message column's divider | Same. |
| 5 | Reset the columns to their defaults | Lanes return to their place. |
| 6 | Look for any lane line drawn over the message text | There must be none, at any column arrangement. |

**Result:**

---

## FEAT-035-T6 — Zoom and text size

**Priority:** high — the geometry is scaled by both.

| # | Step | Expected |
| --- | --- | --- |
| 1 | In a compressed region, raise interface zoom to 200% | Lanes scale with everything else and stay inside the column. |
| 2 | At 200%, check nodes against lanes | Same relationship as at 100%. |
| 3 | Raise text size to 130% | Row pitch grows; lane spacing is horizontal and unaffected. |
| 4 | Return both to 100% | Layout returns to T2's state. |
| 5 | At each step, look for a lane line one pixel off its node | There must be none — half-pixel drift is what the rounding exists to prevent. |

**Result:**

---

## FEAT-035-T7 — Depth changing under the reader

**Priority:** medium

| # | Step | Expected |
| --- | --- | --- |
| 1 | Scroll from a shallow region into a deep one | The column widens immediately, up to the cap, then **stops widening** and the lanes tighten instead. |
| 2 | Scroll back to the shallow region | The column stays wide for a moment, then narrows once. It does not flicker. |
| 3 | Scroll back and forth across the boundary repeatedly | The message column does not jump left and right under the eyes. |
| 4 | Watch the message column while crossing the twelve-lane boundary | It stops moving at the cap and never moves again however deep the history goes. |

**Result:**

---

## FEAT-035-T8 — A history that defeats any width

**Priority:** low — the documented limit, confirmed rather than fixed.
**Preconditions:** `git/git`, or another repository peaking past 48 lanes.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Scroll to the deepest region | The graph draws without error and without drawing outside its column. |
| 2 | Look at the deepest lanes | Past about 48 they **do** share a column. **Expected and documented** — the old behaviour, now four times deeper. |
| 3 | Confirm they keep their own colours | They stay tellable apart by colour, as before. |
| 4 | Check performance | Scrolling is no slower than before this change. |

**Result:**
