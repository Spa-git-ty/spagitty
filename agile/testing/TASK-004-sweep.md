<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-004 — Manual sweep

| Field | Meaning |
| --- | --- |
| Priority | P1 blocks the item, P2 should be fixed before release, P3 cosmetic |
| Result | left blank for the tester: pass / fail |

---

### SWEEP-004-01 — The packaged application installs under its own name

- **Priority:** P1
- **Preconditions:** A release build produced from this branch. No previously
  installed GitLord build present.
- **Steps:**
  1. Build and install the bundle for the host platform.
  2. Open the operating system's installed-application list.
  3. Launch it from there rather than from a shell.
- **Expected:** It is listed as **GitLumiere**, launches, and paints the Graph
  screen. Nothing anywhere reads GitLord.
- **Result:**

### SWEEP-004-02 — The capability manifest still grants what the app needs

- **Priority:** P1
- **Preconditions:** The installed build from SWEEP-004-01.
- **Steps:** Open a repository through the file-picker dialog, let the graph
  load, then open Settings and change the theme.
- **Expected:** The dialog opens, the repository loads, the theme applies and
  survives a restart. A capability that failed to move with the identifier shows
  up as a permission error in the console on one of these three, not as a crash.
- **Result:**

### SWEEP-004-03 — Old persisted state is orphaned, not corrupting

- **Priority:** P2
- **Preconditions:** A machine that ran a **GitLord** development build before,
  so `gitlord.scale.*` keys exist in the webview's local storage.
- **Steps:**
  1. Launch the renamed build.
  2. Check the zoom and text-size dials, and the recent-repository list.
  3. Change zoom, quit, relaunch.
- **Expected:** The dials start at their defaults and the recents list is empty —
  the one-time loss recorded in the item's non-scope. The new value written in
  step 3 survives the relaunch. What must **not** happen: a half-read old value,
  a crash on startup, or an empty screen.
- **Result:**

### SWEEP-004-04 — No stale name in the rendered UI

- **Priority:** P2
- **Steps:** Walk every screen — Graph, Diff, Working copy, Branches, Stash, All
  repositories, Log search, Conflicts, Rebase, Pull requests, Settings — plus the
  Clone modal, the title bar, the command palette, and About.
- **Expected:** Every visible name is GitLumiere. The window title, the About
  dialog's product line, and the license/attribution text included.
- **Result:**

### SWEEP-004-05 — CI workflow names and artifacts

- **Priority:** P3
- **Preconditions:** Actions enabled on the repository.
- **Steps:** Open the workflow run for this branch and look at the job names and
  any uploaded artifact names.
- **Expected:** GitLumiere throughout; no artifact filename carrying the old
  name.
- **Result:**
