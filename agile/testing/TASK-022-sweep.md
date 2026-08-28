<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-022 — Manual sweep

**Item:** [`agile/items/TASK-022-the-glass-goes-back-on-the-gpu.md`](../items/TASK-022-the-glass-goes-back-on-the-gpu.md)

**Preconditions for every ticket:** a build of the branch, and a repository with
enough history that scrolling it is real work — a few thousand commits.

---

## TASK-022-T1 — The reported failure is gone

**Priority:** high — this is the report.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open the large repository on the Graph screen and scroll it hard | Smooth. Note how it feels; this is the baseline. |
| 2 | Open the branch dropdown and scroll the graph behind it with the wheel | **Exactly as smooth as step 1.** Not "better than before" — indistinguishable from having no menu open. |
| 3 | Open a dialog and do the same | Same. |
| 4 | Open a menu, then move the window around by its title bar | No lag while dragging. |
| 5 | Open and close a menu twenty times in a row, quickly | No accumulating slowdown, no stutter on the twentieth. |

**Result:**

---

## TASK-022-T2 — It still looks like glass

**Priority:** high — the frost is meant to be identical, not merely present.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open a menu over the commit list | Frosted: text behind it is colour and shape, not readable words. |
| 2 | Look at the colour behind the pane | Grey — `saturate(0)` drains it. It should read as grey light, not as a tint of the commits underneath. |
| 3 | Compare against a screenshot from before this change, if one is to hand | The frost should be the same. Only the refracted ring at the rim is gone. |
| 4 | Look at the pane's edge against a **dark** region of the commit list | This is the risk. The pane has tint and cast shadow and nothing else — if the edge is lost here, say so, and `--glass-rim-thick` comes back as one declaration. |
| 5 | Same against a light region, and in a light theme | Same judgement. |

**Result:**

---

## TASK-022-T3 — Every pane took the change

**Priority:** high — five surfaces shared the retired mechanism.

| # | Step | Expected |
| --- | --- | --- |
| 1 | A context menu on a commit | Frosted, fast. |
| 2 | A confirmation dialog | Frosted, fast, centred. |
| 3 | The command palette | Frosted, fast. |
| 4 | A notice toast — do something that fails, such as fetching with no remote | Frosted, fast. |
| 5 | The command log, opened from the status strip | Frosted, fast, with its upward shadow intact. |
| 6 | A menu open over a dialog | Both frosted, correct where they overlap, neither slowing the other. |

**Result:**

---

## TASK-022-T4 — Nothing filters anything any more

**Priority:** medium — the fix is the absence of a thing, which is worth checking directly.

| # | Step | Expected |
| --- | --- | --- |
| 1 | With a menu open, inspect `.lens` in the Web Inspector | Its computed `filter` is `none`. It should never be anything else again. |
| 2 | Look for `#liquid-glass-lens` in the document | Absent. No SVG host is created at all. |
| 3 | Look for `.liquid-glass-stage` | Absent. Nothing is portaled, so no stage exists. |
| 4 | Open a menu and confirm it is a child of the component that raised it | It stays where it was mounted — the whole class of BUG-018 is gone with the portal. |

**Result:**

---

## TASK-022-T5 — On a display at another scale

**Priority:** medium — the retired lens was sensitive to the device pixel ratio; this must not be.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Read `devicePixelRatio` in the inspector | Record it. |
| 2 | Open a menu | Frost correct, window whole, no clipping anywhere — the BUG-017 failure cannot recur, since nothing computes a region. |
| 3 | If a second display at a different scale is available, move the window and repeat | Identical. |
| 4 | Change the interface zoom with Ctrl `=` and Ctrl `-`, with a menu open | Frost follows the pane; no wipe, no lag. |

**Result:**
