<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-018 — Manual sweep

| Field | Meaning |
| --- | --- |
| Priority | P1 blocks the item, P2 should be fixed before release, P3 cosmetic |
| Result | left blank for the tester: pass / fail |

Needs a real remote and, for -02, a repository large enough that a fetch takes
more than a second. A clone of something substantial is the easiest way.

---

### SWEEP-018-01 — Fetch does not prune unless asked

- **Priority:** P1
- **Steps:** With **Prune deleted branches when fetching** off, delete a branch
  on the remote and fetch. Check `git branch -r`. Then turn the setting on and
  fetch again.
- **Expected:** The remote-tracking ref is **still there** after the first
  fetch and gone after the second. The command log shows `--prune` only on the
  second. This is the defect: it used to prune every time.
- **Result:**

### SWEEP-018-02 — Progress moves while it runs

- **Priority:** P1
- **Steps:** Fetch a large repository and watch the toolbar.
- **Expected:** git's own phases appear and change — counting, compressing,
  receiving — with percentages where git gives them. It does not sit silent and
  then finish all at once.
- **Result:**

### SWEEP-018-03 — Fetching one remote

- **Priority:** P1
- **Steps:** On a repository with two remotes, right-click **Fetch**.
- **Expected:** A menu with "Every remote" and each remote by name with its URL.
  Choosing one fetches only that one — the command log shows its name, not
  `--all`.
- **Result:**

### SWEEP-018-04 — The Branches screen says how stale it is

- **Priority:** P1
- **Steps:** Open Branches on a repository not fetched for a while. Read the
  header. Press **Fetch** there and read it again.
- **Expected:** "drift as of …" with a real age, and it becomes recent after
  fetching. On a repository whose branches track nothing, the line is absent
  rather than saying something meaningless.
- **Result:**

### SWEEP-018-05 — A rejected push says why

- **Priority:** P1
- **Steps:** Make the remote branch ahead of yours, then push.
- **Expected:** git's own "non-fast-forward" wording, in a notice and on the
  toolbar. Nothing offers to force.
- **Result:**

### SWEEP-018-06 — Nothing else freezes while it runs

- **Priority:** P1
- **Steps:** Start a slow fetch and immediately navigate to Branches, then to
  the Graph, and open a commit.
- **Expected:** Everything responds. The fetch's progress is still visible on
  the toolbar throughout, and finishing it refreshes what is on screen.
- **Result:**

### SWEEP-018-07 — A second operation is refused, not queued

- **Priority:** P2
- **Steps:** Start a slow fetch and press Push before it finishes.
- **Expected:** A message saying one is already running. Nothing is queued, and
  when the fetch finishes the push has *not* silently happened.
- **Result:**

### SWEEP-018-08 — The worker is let go of

- **Priority:** P1
- **Steps:** Fetch, let it finish, then fetch again. Three or four times.
- **Expected:** Every one starts. If the worker were leaked, the second would
  refuse with "already running" — which is the failure this is looking for.
- **Result:**

### SWEEP-018-09 — First push still sets upstream

- **Priority:** P1
- **Steps:** Push a brand-new branch, then check `git branch -vv`.
- **Expected:** It tracks the remote. FEAT-049 fixed this and this item's
  changes must not have undone it.
- **Result:**

### SWEEP-018-10 — The command log matches what ran

- **Priority:** P3
- **Steps:** Fetch all, fetch one remote with pruning on, and push. Read the
  log.
- **Expected:** Three different lines, each with the flags actually used. A
  fetch that pruned is distinguishable from one that did not.
- **Result:**
