<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-029 — Manual sweep

| Field | Meaning |
| --- | --- |
| Priority | P1 blocks the item, P2 should be fixed before release, P3 cosmetic |
| Result | left blank for the tester: pass / fail |

---

### SWEEP-029-01 — A portrait reads as a face

- **Priority:** P1
- **Preconditions:** A repository with commits from at least four different
  authors. Zoom and text size both at 100%. Normal seated viewing distance.
- **Steps:**
  1. Open the Graph screen and look at the node column without leaning in.
  2. Pick two authors and follow their commits down the list.
  3. Compare a node against the same author's avatar in the Author column.
- **Expected:** Each node is recognisably a distinct generated face, and the same
  author is identifiable as the same person at both sizes. The failure this item
  exists to fix: nodes that read as coloured dots you have to squint at.
- **Result:**

### SWEEP-029-02 — Adjacent nodes keep daylight, adjacent selections do not

- **Priority:** P1
- **Preconditions:** A repository with a run of consecutive commits in one lane.
- **Steps:**
  1. At 100%, look at three stacked commits in the same lane.
  2. Select a run of four adjacent rows.
  3. Repeat both at 200% zoom and at text size 1.3.
- **Expected:** Background is visible between two stacked portraits at every
  combination — never a solid stripe of faces. The four selected rows draw as one
  continuous band with square corners, with no pinch between rows.
- **Result:**

### SWEEP-029-03 — The rail scales with both dials

- **Priority:** P1
- **Steps:**
  1. Note the size of the rail's glyphs and labels at 100% / 100%.
  2. Turn text size to 1.3. Then back, and turn zoom to 2.0. Then both.
  3. Collapse and expand the rail at each setting.
- **Expected:** Glyphs and labels grow and shrink with both dials, in step with
  the rest of the chrome. The bug this fixed: the rail alone staying at its
  original size while everything around it grew.
- **Result:**

### SWEEP-029-04 — Type scale and text rendering

- **Priority:** P2
- **Steps:** Walk Graph, Diff, and Working copy. Read a wall of diff lines, a
  commit message, a short SHA chip, and a screen title. Check on an external
  monitor as well as the built-in panel if both are available.
- **Expected:** Text is comfortably readable at 100% without reaching for the
  dial. Line spacing looks deliberate — lines neither cramped nor floating apart
  (this is the `line-height` BUG-005 restored; if it looks wrong, that is the
  regression returning). No colour fringing on glyph edges from subpixel
  antialiasing, on any monitor, in light or dark theme.
- **Result:**

### SWEEP-029-05 — The graph draws a real history without dangling edges

- **Priority:** P1
- **Preconditions:** A repository with a genuine merge-heavy history — a
  long-lived clone with hundreds of merges, not a fixture.
- **Steps:**
  1. Open it and scroll the full length of the graph, quickly and then slowly.
  2. Watch particularly where a branch merges back into a line that has already
     been drawn above.
- **Expected:** Every lane line arrives at a node. No line that leaves a node and
  ends in empty space, and no line crossing the whole column to a row that is not
  there. This is what the `visited` fix addresses.
- **Result:**

### SWEEP-029-06 — Lane column width at the cap

- **Priority:** P2
- **Preconditions:** A repository whose lane depth exceeds twelve.
- **Steps:** Open it at a 1280px-wide window and look at the split between the
  lane column and the message column.
- **Expected:** The lane column is 331px and the message column 307px — the graph
  is now the wider of the two at full depth, which is the accepted trade-off in
  the item, not a bug. Fail this ticket only if the message column is so narrow
  that ordinary commit subjects are unreadable.
- **Result:**
