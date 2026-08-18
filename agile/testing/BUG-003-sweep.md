<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-003 — Manual sweep

Test tickets for the lane canvas's alignment.

**What this is.** The graph's canvas used to be positioned at a fixed 186px,
which is only correct while Branch/Tag is at its default width and second in the
order. It is now laid out as part of the same row structure as the cells.

| Field | Meaning |
| --- | --- |
| Priority | P1 blocks the item, P2 should be fixed before release, P3 cosmetic |
| Result | left blank for the tester: pass / fail |

---

### SWEEP-003-01 — Narrow the Branch/Tag column

- **Priority:** P1
- **Steps:** Drag the divider on the right of Branch / Tag to its minimum, then
  back out to its widest.
- **Expected:** The lanes move with the Graph column the whole way. At no point
  does a node land on a message or on a chip. This is the exact reproduction
  from the report.
- **Result:**

### SWEEP-003-02 — Reorder the columns

- **Priority:** P1
- **Steps:** Drag the Graph header to the first position, then to the last.
- **Expected:** The lanes follow it each time, and the column keeps its own
  background with them.
- **Result:**

### SWEEP-003-03 — Add and remove columns

- **Priority:** P1
- **Steps:** Right-click the header. Add Author, Date/Time and SHA; then hide
  Branch/Tag.
- **Expected:** The graph stays inside its column through every change,
  including with Branch/Tag gone entirely.
- **Result:**

### SWEEP-003-04 — Zoom

- **Priority:** P2
- **Steps:** `Ctrl +` and `Ctrl -` a few steps each way with a branchy history
  on screen.
- **Expected:** Lanes stay centred on their nodes and inside the column at every
  step — no drift of a pixel or two per level, which is the failure this class
  of bug tends to leave behind.
- **Result:**

### SWEEP-003-05 — Nothing swallows a click

- **Priority:** P1
- **Steps:** With the graph on screen, click a row, double-click one to open its
  diff, right-click one for its menu, and drag a branch label onto another.
- **Expected:** All four work. The layer sits over the rows, so this is what
  proves it is transparent to the pointer.
- **Result:**

### SWEEP-003-06 — Restart

- **Priority:** P2
- **Steps:** Resize Branch/Tag, close the app, reopen it on the same repository.
- **Expected:** The stored width comes back *and* the graph is aligned to it on
  the first frame — not aligned only after the first drag.
- **Result:**
