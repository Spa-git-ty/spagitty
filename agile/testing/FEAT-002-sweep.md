<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-002 — Manual sweep

Test tickets for the Diff screen (1B).

**Fixture.** The repository built by `docs/testing.md`, which carries a text
file with changes at both ends, a new file, a binary file, a dotfile and a
deeply nested path. Compare against `git show <sha>` in a terminal.

| Field | Meaning |
| --- | --- |
| Priority | P1 blocks the item, P2 should be fixed before release, P3 cosmetic |
| Result | left blank for the tester: pass / fail |

---

### SWEEP-1B-01 — Opening a diff from the graph

- **Priority:** P1
- **Preconditions:** Fixture open on the Graph screen.
- **Steps:** Double-click a commit that changed one file.
- **Expected:** The Diff screen opens. The header shows the short SHA and the
  commit's subject. The file list has that one file selected already, and its
  hunks are on screen — no empty pane waiting for a click.
- **Result:**

### SWEEP-1B-02 — Header totals match git

- **Priority:** P1
- **Preconditions:** A commit touching several files is open.
- **Steps:** Compare the header against `git show --stat <sha>`.
- **Expected:** The file count and `+n −m` totals agree with git.
- **Result:**

### SWEEP-1B-03 — Line numbers match `git show`

- **Priority:** P1
- **Preconditions:** A commit with a change in the middle of a long file.
- **Steps:** Put the GitLumiere pane and `git show <sha>` side by side.
- **Expected:** Every hunk header matches. Every line's old and new numbers
  match. A removed line shows no new number; an added line shows no old number.
- **Result:**

### SWEEP-1B-04 — Two distant changes are two hunks

- **Priority:** P2
- **Preconditions:** The commit that changes both the top and the bottom of
  `core.txt`.
- **Steps:** Read the pane top to bottom.
- **Expected:** Two `@@` headers, in file order, each with three lines of
  context around its change.
- **Result:**

### SWEEP-1B-05 — A new file

- **Priority:** P2
- **Preconditions:** A commit that adds a file.
- **Steps:** Select the added file.
- **Expected:** The glyph is `+` in the accent colour, the header reads
  `@@ -0,0 +1,n @@`, and every line is an addition.
- **Result:**

### SWEEP-1B-06 — A binary file

- **Priority:** P1
- **Preconditions:** A commit touching `logo.bin`.
- **Steps:** Select it.
- **Expected:** The row shows `bin`, not `+0 −0`. The pane says the file is
  binary and there are no lines to show.
- **Result:**

### SWEEP-1B-07 — Unified and split agree

- **Priority:** P1
- **Preconditions:** Any file with additions and removals open.
- **Steps:** Read the hunk in unified, press **split**, read it again.
- **Expected:** Same lines, same numbers, same order. Nothing refetches — the
  switch is instant. Removals sit on the left, additions on the right, paired
  row by row, with a tinted blank opposite the tail of the longer run.
- **Result:**

### SWEEP-1B-08 — Split columns stay level

- **Priority:** P2
- **Preconditions:** Split view, a file containing a line long enough to wrap in
  half the pane's width.
- **Steps:** Narrow the window until that line wraps.
- **Expected:** The opposite cell moves down with it; the two sides never
  drift apart by a row.
- **Result:**

### SWEEP-1B-09 — The view choice persists

- **Priority:** P3
- **Preconditions:** Split selected.
- **Steps:** Close GitLumiere, reopen it, open any diff.
- **Expected:** Split is still selected.
- **Result:**

### SWEEP-1B-10 — Walking the file list

- **Priority:** P2
- **Preconditions:** A commit with at least three files open.
- **Steps:**
  1. Press **Next file** repeatedly past the end.
  2. Press **Prev file** repeatedly past the start.
  3. Click back to a file already viewed.
- **Expected:** The position reads `n of m` and stops at either end without
  wrapping; the buttons disable there. Returning to a viewed file is instant —
  no "Reading…" flash.
- **Result:**

### SWEEP-1B-11 — Hunk navigation

- **Priority:** P2
- **Preconditions:** A file with several hunks open.
- **Steps:** Press `j` several times, then `k` back to the top.
- **Expected:** Each press brings the next hunk to the top of the pane. It stops
  at the last hunk and at the first. Selecting a different file resets to its
  first hunk.
- **Result:**

### SWEEP-1B-12 — Esc returns to the graph

- **Priority:** P1
- **Preconditions:** Diff screen open.
- **Steps:** Press `Esc`, then use the `← Graph` button from another diff.
- **Expected:** Both return to the Graph screen with the previous scroll
  position and selection intact.
- **Result:**

### SWEEP-1B-13 — Keys do not fire while typing

- **Priority:** P2
- **Preconditions:** Diff screen open, and any text field on screen focused.
- **Steps:** Type the letters `j`, `k` and press `Esc` while the field has
  focus.
- **Expected:** `j` and `k` are typed into the field and do not move hunks.
- **Result:**

### SWEEP-1B-14 — Path rendering

- **Priority:** P3
- **Preconditions:** A commit touching `.gitignore` and
  `src/deep/nested/main.rs`.
- **Steps:** Read the file list.
- **Expected:** `.gitignore` renders with its leading dot, not as `gitignore.`.
  The long path elides at its head, so the filename stays visible. Hovering
  shows the full path.
- **Result:**

### SWEEP-1B-15 — A commit that does not exist

- **Priority:** P2
- **Preconditions:** GitLumiere running with a repository open.
- **Steps:** Navigate to `/diff?commit=0000000000000000000000000000000000000000`.
- **Expected:** A plain message that there is no such commit. No blank screen,
  no stack trace.
- **Result:**

### SWEEP-1B-16 — Opened before the repository is

- **Priority:** P2
- **Preconditions:** GitLumiere closed.
- **Steps:** Launch straight onto a commit's diff URL.
- **Expected:** The screen waits for the repository to finish opening, then
  loads the commit. It never shows "no repository is open" for a repository
  that is about to be open.
- **Result:**

### SWEEP-1B-17 — Both themes

- **Priority:** P2
- **Preconditions:** A diff with additions and removals open.
- **Steps:** Toggle the theme.
- **Expected:** Added and removed tints are distinguishable from each other and
  from the blank cell tint, in both themes, and the code stays legible on top of
  them.
- **Result:**
