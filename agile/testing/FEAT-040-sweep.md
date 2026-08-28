<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-040 — Manual sweep

**Item:** [`agile/items/FEAT-040-graph-footer.md`](../items/FEAT-040-graph-footer.md)

The footer reports three facts about the world outside the application. The
tests prove the wiring; only a person with a real repository can prove the
numbers are true.

---

## FEAT-040-T1 — The hints are gone

**Priority:** high.

**Preconditions:** the application running, any repository open on the Graph
screen (1A).

| # | Step | Expected |
| --- | --- | --- |
| 1 | Read the two lines at the bottom of the graph | Neither tells you how to operate the screen. No mention of dragging a branch, right-clicking a row, or double-clicking a row. |
| 2 | Drag a branch onto another, then right-click a row, then double-click a row | All three still work. The item removed the copy, not the behaviour. |

**Result:**

---

## FEAT-040-T2 — The changed-file count is the Working copy count

**Priority:** high — this is the acceptance criterion most likely to drift.

**Preconditions:** a repository with a clean working copy.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Look at the footer with nothing modified | `no changed files`. |
| 2 | Modify one file outside the application | The footer reads `1 changed file` — singular — and the rail's Working copy count reads the same. |
| 3 | Modify two more | `3 changed files`; the rail agrees. |
| 4 | Open the Working copy screen (1C) and count the rows | The same number, again. |
| 5 | Revert everything | Back to `no changed files`. |

**Result:**

---

## FEAT-040-T3 — The refresh time is the walk's, not the process's

**Priority:** high.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open a repository and watch the footer while the graph draws | While the walk runs it says `walking…`; it does not date anything. |
| 2 | Wait for the graph to finish | `refreshed` plus a time that starts at the most recent thing `relativeTime` says. |
| 3 | Leave the window alone for several minutes, then commit something so the walk re-runs | The time is fresh again — it dated the new walk, not the old one. |
| 4 | Open a large repository and switch away before the walk finishes | The cancelled walk is not dated. |

**Result:**

---

## FEAT-040-T4 — Never fetched says so

**Priority:** high — the negative path the item asks for by name.

| # | Step | Expected |
| --- | --- | --- |
| 1 | `git init` a new repository, make one commit, open it | The footer says `never fetched`. No empty time, no `just now`, no invented date. |
| 2 | Confirm `.git/FETCH_HEAD` does not exist | It does not. |
| 3 | Add a remote and `git fetch` in a terminal | Reopen or refresh the repository: the footer now says `fetched` plus a fresh time. |

**Result:**

---

## FEAT-040-T5 — A fetch that brings nothing down still counts

**Priority:** medium — this is the case that ruled out reflogs, and the reason
the mtime was chosen.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open a repository already up to date with its remote | Note the fetch time. |
| 2 | `git fetch` in a terminal; it reports nothing new | Reopen the repository: the fetch time is fresh. A fetch that moved no ref is still a fetch. |
| 3 | Clone a repository fresh and open it | It has a fetch time from the clone, not `never fetched`. |

**Result:**

---

## FEAT-040-T6 — The footer does not tick, and does not lie about it

**Priority:** medium.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Watch the footer for two minutes with nothing else happening | The text does not animate or count. It is allowed to be stale between events; that is the design. |
| 2 | Change a file | The count updates, and the two ages are re-read at the same moment. |
| 3 | Switch to another repository and back | Both ages belong to the repository now open, not to the previous one. |

**Result:**

---

## FEAT-040-T7 — Narrow window

**Priority:** low.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Narrow the window until the footer is tight | The two spans wrap or clip without pushing the graph, and the `·` separator stays between the refresh and fetch phrases rather than starting a line. |

**Result:**
