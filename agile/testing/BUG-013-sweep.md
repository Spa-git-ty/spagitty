<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-013 — Manual sweep

**Item:** [`agile/items/BUG-013-tab-strip-with-no-repository.md`](../items/BUG-013-tab-strip-with-no-repository.md)

**Preconditions for every ticket:** a built application, at least two
repositories on disk, and a way to remove one of them from its path — renaming
its folder is enough.

---

## BUG-013-T1 — The command line still wins

**Priority:** high — the one behaviour the fix could have taken away.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open repository A, leave it as the active tab, and close the application | |
| 2 | Start it again with repository B's path as an argument | B is open, not A. |
| 3 | Look at the tab strip | A is still there. Being passed over is not being closed. |
| 4 | Close and restart with no argument | Whichever tab was left active opens. |

**Result:**

---

## BUG-013-T2 — The session actually comes back

**Priority:** high — the report.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open a repository, go to the Branches screen, and close the application | |
| 2 | Start it again with no argument | The repository is open: HEAD named in the title bar, counts in the rail, rows walked. |
| 3 | Look at which screen you are on | Branches, not the graph. |
| 4 | Repeat, but leave a commit selected on the graph before closing | The same commit is selected when it comes back, after the walk reaches it. |
| 5 | Confirm the tab is not merely a label | The graph has rows, and the rail counts are numbers rather than `·`. |

**Result:**

---

## BUG-013-T3 — A repository that has gone

**Priority:** high — the failure path, and the one where data can appear to be lost.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open repository A, close the application | |
| 2 | Rename A's folder on disk | |
| 3 | Start the application | The tab for A is **still there**. |
| 4 | Read what the window says | An error naming what happened — not an empty window with no explanation. |
| 5 | Open All repositories | A is marked missing. |
| 6 | Rename the folder back and restart | A opens normally. |

**Result:**

---

## BUG-013-T4 — Nothing stored, nothing opened

**Priority:** medium — first run, and the state after every tab is closed.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Close every tab, then close the application | |
| 2 | Start it again | An empty window with the Open repository slot in the rail. No error, no spinner that never ends. |
| 3 | Clear the application's storage entirely and start again | The same. A first run is not a failure. |

**Result:**

---

## BUG-013-T5 — Closing while it restores

**Priority:** low — the `cancelled` guard, which is invisible when it works.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Store a large repository as the active tab | |
| 2 | Start the application and close the window while the walk is still running | It closes. No error dialog, no process left behind. |
| 3 | Start it again | It restores normally. The interrupted attempt left nothing broken behind it. |

**Result:**
