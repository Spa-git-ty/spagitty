<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-026 — Manual sweep

| Field | Meaning |
| --- | --- |
| Priority | P1 blocks the item, P2 should be fixed before release, P3 cosmetic |
| Result | left blank for the tester: pass / fail |

---

### SWEEP-026-01 — Collapse and expand

- **Priority:** P1
- **Steps:** Click the button at the top of the rail. Click it again.
- **Expected:** The rail becomes a narrow strip of glyphs and back. The graph
  takes the reclaimed width immediately — no rail-shaped gap left behind.
- **Result:**

### SWEEP-026-02 — Collapsed, everything is still reachable

- **Priority:** P1
- **Steps:** Collapsed, hover each glyph, then click through every screen.
- **Expected:** A tooltip naming each screen, the right screen on each click,
  and the active one still marked.
- **Result:**

### SWEEP-026-03 — The dragged width comes back

- **Priority:** P1
- **Steps:** Drag the rail to about 300px, collapse, expand.
- **Expected:** 300px, not the 186px default.
- **Result:**

### SWEEP-026-04 — The splitter is inert while collapsed

- **Priority:** P2
- **Steps:** Collapsed, try to drag the divider beside the rail, then focus it
  and press the arrow keys.
- **Expected:** Nothing moves either way, and the tooltip says to expand it
  first.
- **Result:**

### SWEEP-026-05 — Restart

- **Priority:** P2
- **Steps:** Collapse, close the app, reopen.
- **Expected:** Still collapsed, on the first frame — no expanded rail flashing
  before it narrows.
- **Result:**

### SWEEP-026-06 — Keyboard and screen reader

- **Priority:** P3
- **Steps:** Tab to the collapse button and press Enter. With a screen reader,
  move through the collapsed rail.
- **Expected:** The button announces itself as expanded or collapsed, and each
  item is announced by its screen name rather than as an unlabelled button.
- **Result:**
