<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-025 — Manual sweep

| Field | Meaning |
| --- | --- |
| Priority | P1 blocks the item, P2 should be fixed before release, P3 cosmetic |
| Result | left blank for the tester: pass / fail |

---

### SWEEP-025-01 — The message column resizes

- **Priority:** P1
- **Steps:** Drag the divider on the right of Commit Message left and right.
- **Expected:** It follows the pointer from where it currently is — no jump to a
  minimum on the first pixel — and stops at 160px.
- **Result:**

### SWEEP-025-02 — Double-click hands the fill back

- **Priority:** P1
- **Steps:** After resizing it, double-click that same divider.
- **Expected:** The column goes back to taking whatever is left, and the table
  stops scrolling sideways.
- **Result:**

### SWEEP-025-03 — Sideways scrolling

- **Priority:** P1
- **Steps:** Widen Commit Message and Branch/Tag until the columns are wider
  than the window. Scroll sideways with the trackpad, then with shift+wheel.
- **Expected:** Header, rows and lanes move together with no visible lag between
  them. The graph stays inside its own column the whole way — a node landing on
  a message here is BUG-003 returning and should be reported as such.
- **Result:**

### SWEEP-025-04 — Long branch names

- **Priority:** P2
- **Steps:** On a repository with long branch names, widen Branch/Tag and scroll
  to it.
- **Expected:** The full names are readable rather than clipped.
- **Result:**

### SWEEP-025-05 — The graph column still refuses

- **Priority:** P2
- **Steps:** Try to drag the divider on the right of Graph.
- **Expected:** Nothing moves, and the tooltip says the column is sized to the
  lanes on screen.
- **Result:**

### SWEEP-025-06 — Restart

- **Priority:** P2
- **Steps:** Size the columns, close the app, reopen the same repository.
- **Expected:** The layout comes back, including whether the message column
  fills.
- **Result:**
