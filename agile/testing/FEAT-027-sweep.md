<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-027 — Manual sweep

| Field | Meaning |
| --- | --- |
| Priority | P1 blocks the item, P2 should be fixed before release, P3 cosmetic |
| Result | left blank for the tester: pass / fail |

---

### SWEEP-027-01 — Tabs appear however a repository is opened

- **Priority:** P1
- **Steps:** Open one repository from All repositories, a second from the `+`
  menu, and a third by launching `gitlord /path/to/repo`.
- **Expected:** A tab for each, the newest active, none duplicated.
- **Result:**

### SWEEP-027-02 — A tab returns you to where you were

- **Priority:** P1
- **Steps:** In repository A select a commit on the Graph. Switch to B and go to
  Branches. Switch back to A, then back to B.
- **Expected:** A returns to the Graph with that commit selected once the walk
  reaches it; B returns to Branches. Neither lands at the top of the graph with
  the selection lost.
- **Result:**

### SWEEP-027-03 — Switching is honest about loading

- **Priority:** P1
- **Steps:** Switch to a repository with a large history and watch the tab.
- **Expected:** The tab shows it is opening and the graph fills progressively.
  It must not show an empty graph as though the repository had no commits.
- **Result:**

### SWEEP-027-04 — Closing

- **Priority:** P1
- **Steps:** Close the active tab, then an inactive one, then the last one.
- **Expected:** Closing the active one switches to its neighbour; closing an
  inactive one leaves you where you are; closing the last leaves an empty state.
  In every case the repository is still listed in All repositories.
- **Result:**

### SWEEP-027-05 — The `+` menu

- **Priority:** P2
- **Steps:** Open the menu with several repositories already open.
- **Expected:** Open repository… and Clone… at the top, then the recent ones
  *not* already open. A repository missing from disk is listed but disabled with
  its reason.
- **Result:**

### SWEEP-027-06 — Restart

- **Priority:** P1
- **Steps:** Open three repositories, select a commit in the active one, quit,
  reopen.
- **Expected:** The strip comes back with the same tabs and the same active one.
- **Result:**

### SWEEP-027-07 — The window still drags

- **Priority:** P2
- **Steps:** Drag the empty space in the title bar; then double-click it. Then
  click a tab and drag slightly.
- **Expected:** The window moves and maximizes from the bar itself; dragging a
  tab does not move the window.
- **Result:**

### SWEEP-027-08 — A repository that has moved

- **Priority:** P3
- **Steps:** Open a repository, quit, rename its directory, reopen GitLord and
  click its tab.
- **Expected:** A failure reported in the notice, the tab still there to close.
  Not a blank screen.
- **Result:**
