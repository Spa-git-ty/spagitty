<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-019 — Manual sweep

| Field | Meaning |
| --- | --- |
| Priority | P1 blocks the item, P2 should be fixed before release, P3 cosmetic |
| Result | left blank for the tester: pass / fail |

This sweep is the only place the real port is exercised. `resumeSession` is
asserted against a recorder, so a shell that bound the wrong store to the right
member would pass every automated test and fail every ticket below.

Behaviour is supposed to be **unchanged** by this item. A failure here is a
refactor that moved something, not a feature that misbehaved.

---

### SWEEP-019-01 — A path on the command line opens that repository

- **Priority:** P1
- **Preconditions:** Quit Spagitty with some other repository as the active tab,
  so the strip has something in it that is not the path about to be given.
- **Steps:** Start it from a terminal with a repository path as the only
  argument: `spagitty ~/some/other/repo`.
- **Expected:** That repository opens and is the active tab. The graph walks, the
  branch chip and the counts are its own. Nothing navigates away from the screen
  it opens on, and the tab that was active last time is **not** opened.
- **Result:**

### SWEEP-019-02 — With no argument, the last session comes back

- **Priority:** P1
- **Preconditions:** Open a repository, go to **Branches**, quit from there.
- **Steps:** Start Spagitty with no arguments.
- **Expected:** The tab strip comes back with that repository, the repository is
  actually open — HEAD, counts and a walked graph, not just a name — and the
  window lands on **Branches**.
- **Result:**

### SWEEP-019-03 — The selected commit comes back with the screen

- **Priority:** P1
- **Preconditions:** Open a repository with more than one screenful of history,
  select a commit well down the list, and quit from the Graph screen.
- **Steps:** Start Spagitty with no arguments and wait for the walk to finish.
- **Expected:** The same commit is selected and its detail panel is filled, even
  though the walk had not reached it when the window opened.
- **Result:**

### SWEEP-019-04 — A repository that has moved leaves its tab alone

- **Priority:** P1
- **Preconditions:** Open a repository and quit with it active.
- **Steps:** Rename or move its directory on disk, then start Spagitty.
- **Expected:** The tab is still there, an error says the repository could not be
  opened, and All repositories marks it missing. The window does **not** navigate
  into a screen for a repository that is not open, and the tab is not silently
  dropped.
- **Result:**

### SWEEP-019-05 — A first launch does nothing at all

- **Priority:** P2
- **Preconditions:** Clear the stored workspace — the `spagitty.workspace` key in
  the application's storage — so there is no tab and no active path.
- **Steps:** Start Spagitty with no arguments.
- **Expected:** The empty state, no error, no navigation, and no repository
  opened.
- **Result:**

### SWEEP-019-06 — Quitting during a launch leaves nothing behind

- **Priority:** P2
- **Preconditions:** A repository large enough that the first walk takes a
  visible moment.
- **Steps:** Start Spagitty and close the window while it is still opening.
- **Expected:** It exits cleanly. No navigation happens after the window is gone,
  and nothing is written to the workspace on the way out.
- **Result:**

### SWEEP-019-07 — Staying put when the route has not changed

- **Priority:** P3
- **Preconditions:** Quit from the Graph screen, which is the route a launch
  lands on anyway.
- **Steps:** Start Spagitty with no arguments and watch the window as it opens.
- **Expected:** No visible navigation or reload of the screen — it opens on Graph
  and stays there. A flash of the screen re-rendering is a failure of this
  ticket, not a cosmetic detail: it means the stored route was navigated to
  despite already being current.
- **Result:**
