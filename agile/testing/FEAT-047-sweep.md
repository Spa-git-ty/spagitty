<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-047 — Manual sweep

| Field | Meaning |
| --- | --- |
| Priority | P1 blocks the item, P2 should be fixed before release, P3 cosmetic |
| Result | left blank for the tester: pass / fail |

Use a repository with several branches, at least one of them both ahead and
behind its upstream, and at least one with no upstream at all. The fixture in
[`docs/testing.md`](../../docs/testing.md) does not diverge on its own — fetch a
real repository, or push a commit to one branch and reset another back.

---

### SWEEP-047-01 — The columns drag

- **Priority:** P1
- **Steps:** On Branches, drag the divider on the right of `last change` left
  and right. Then drag the one on `branch`.
- **Expected:** The boundary goes where the pointer goes. The column left of the
  divider grows, everything right of it shifts along. The branch name stops
  filling once it is dragged and keeps the width it was given.
- **Result:**

### SWEEP-047-02 — The widths come back

- **Priority:** P1
- **Steps:** Resize two columns. Switch to another repository, then back. Close
  the application and reopen it.
- **Expected:** The widths are as you left them, for that repository. The other
  repository has its own.
- **Result:**

### SWEEP-047-03 — Four states, at a glance

- **Priority:** P1
- **Steps:** Look at the drift column without reading any number.
- **Expected:** Four states, each obviously not the others: a branch with no
  upstream shows no bar; a level branch shows a lone accented tick; a one-sided
  branch shows a segment on one side of the tick only; a both-ways branch shows
  one on each side. The side that is further has the longer segment.
- **Result:**

### SWEEP-047-04 — The bar and the numbers agree

- **Priority:** P1
- **Steps:** Hover a diverged branch. Compare the sentence in the tooltip, the
  `behind/ahead` counts beside the bar, and `git rev-list --left-right --count`
  for the same branch.
- **Expected:** All three say the same thing.
- **Result:**

### SWEEP-047-05 — A double-click hands the width back

- **Priority:** P2
- **Steps:** Drag `branch` narrow, then double-click its divider.
- **Expected:** It goes back to taking the leftover width, filling the table.
- **Result:**

### SWEEP-047-06 — A column will not shrink to nothing

- **Priority:** P2
- **Steps:** Drag each divider as far left as it will go.
- **Expected:** Each column stops at a width where its content still says
  something. Nothing collapses, and no row's contents escape their cell.
- **Result:**

### SWEEP-047-07 — The graph is exactly as it was

- **Priority:** P1
- **Steps:** Go to the Graph. Drag a column divider, right-click the header,
  toggle a column, and reset the columns.
- **Expected:** All of it behaves as before this item, and the lane canvas still
  sits in the Graph column's own slot. Widths chosen on Branches have not
  appeared here, and vice versa.
- **Result:**

### SWEEP-047-08 — A long branch name

- **Priority:** P3
- **Steps:** Find or create a branch with a very long name and an upstream, and
  narrow the branch column.
- **Expected:** The name ellipsises. The `→ upstream` marker stays visible, and
  the row does not grow taller or push the other columns out of line.
- **Result:**
