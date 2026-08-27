<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-019 — Manual sweep

**Item:** [`agile/items/BUG-019-closing-the-last-tab-leaves-the-repository-open.md`](../items/BUG-019-closing-the-last-tab-leaves-the-repository-open.md)

**Preconditions for every ticket:** a build of the branch, and at least two
repositories available to open.

---

## BUG-019-T1 — The reported failure is gone

**Priority:** high — this is the report.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open one repository, so there is a single tab | The graph fills, the toolbar names it, the rail counts it. |
| 2 | Close that tab with its × | The tab strip goes. |
| 3 | Look at the toolbar | No repository name, no `›`, no branch control. |
| 4 | Look at the nav rail | The counts are gone or blank — not the numbers from the repository just closed. |
| 5 | Look at the Graph screen | Empty. No commits, no lane, no refs from the repository just closed. |
| 6 | Walk the rail — Branches, Tags, Stash, Working copy, Reflog | Each is empty of the closed repository's data. |

**Result:**

---

## BUG-019-T2 — Closing one of several still switches

**Priority:** high — the behaviour the fix must not have broken.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open two repositories | Two tabs, the second active. |
| 2 | Close the active one | The other becomes active and its history is shown. Nothing is emptied. |
| 3 | Open two again, then close the *inactive* one | The active one is untouched — same screen, same scroll, same selection. |
| 4 | Close the remaining one | Now everything empties, as in T1. |

**Result:**

---

## BUG-019-T3 — Closing is not forgetting

**Priority:** medium — the non-scope, stated as a check.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open a repository, go to Branches, select something, then close the tab | Everything empties. |
| 2 | Open the `+` menu in the tab strip | The repository is still listed under recents. |
| 3 | Reopen it from there | It opens, and lands back on Branches where it was left. |
| 4 | Check All repositories | Still listed. Closing a tab did not remove it from Spagitty. |

**Result:**

---

## BUG-019-T4 — Nothing is left running

**Priority:** medium — a close that leaves work in flight is worse than one that leaves state.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open a large repository and close its tab while the graph is still walking | The walk stops. No commits arrive afterwards into an empty screen. |
| 2 | Start a fetch, then close the tab while it runs | The toolbar's network line does not keep reporting progress for a repository that is not open. |
| 3 | Close the tab, then immediately open a different repository | The new one fills correctly, with nothing from the old one mixed in. |

**Result:**
