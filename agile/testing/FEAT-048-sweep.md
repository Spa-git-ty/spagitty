<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-048 — Manual sweep

| Field | Meaning |
| --- | --- |
| Priority | P1 blocks the item, P2 should be fixed before release, P3 cosmetic |
| Result | left blank for the tester: pass / fail |

**Use a throwaway repository.** Every test below destroys work on purpose, and
that is the point of the feature.

---

### SWEEP-048-01 — Discarding a file asks first, and means it

- **Priority:** P1
- **Steps:** Modify a tracked file. On Commit, press `✕` on its unstaged row.
  Read the dialog, then dismiss it. Check the file. Press `✕` again and confirm.
- **Expected:** Dismissing changes nothing at all. Confirming puts the file back
  to what is staged for it. The dialog said "cannot be undone" before either.
- **Result:**

### SWEEP-048-02 — An untracked file says *deleted*

- **Priority:** P1
- **Steps:** Create a new file. Hover its `✕`, then press it.
- **Expected:** Both the tooltip and the dialog say the file is deleted, not
  that changes are discarded. After confirming, the file is gone from disk.
- **Result:**

### SWEEP-048-03 — A staged decision survives

- **Priority:** P1
- **Steps:** Change a file, stage it, change it again. Discard the unstaged row.
- **Expected:** The staged row is still there and still says what it said. The
  file on disk is the staged version. Committing now commits that.
- **Result:**

### SWEEP-048-04 — Discarding one hunk leaves the rest

- **Priority:** P1
- **Steps:** Make two separated changes in one file. Select it, discard the
  first hunk.
- **Expected:** The first change is gone, the second is untouched, and nothing
  moved in or out of the staged column.
- **Result:**

### SWEEP-048-05 — Ignored files are never touched

- **Priority:** P1
- **Steps:** With something ignored present on disk (`.cache/`, `node_modules/`,
  a build directory), use **Discard all**.
- **Expected:** Every unstaged change is gone and every ignored file is still
  there. This is the test that would cost somebody a build directory.
- **Result:**

### SWEEP-048-06 — An untracked directory

- **Priority:** P2
- **Steps:** Create a new directory with files in it. Discard its row.
- **Expected:** The directory and its contents are removed, and nothing outside
  it is.
- **Result:**

### SWEEP-048-07 — The command log says what ran

- **Priority:** P2
- **Steps:** Discard a file, a hunk, and everything. Open the command log.
- **Expected:** A `git restore --worktree`, a `git apply --reverse`, and a
  `git clean` are all there, with the paths, the way every other write is.
- **Result:**

### SWEEP-048-08 — Discard all on a clean tree

- **Priority:** P3
- **Steps:** With nothing unstaged, look at the Unstaged header.
- **Expected:** No **Discard all** button at all — not a disabled one, and not a
  dialog asking about nothing.
- **Result:**

### SWEEP-048-09 — Nothing destructive on the staged side

- **Priority:** P1
- **Steps:** Look at the staged rows and at the hunk pane with a staged file
  open.
- **Expected:** `−` and **unstage hunk**, and no discard control anywhere. The
  only way to throw a staged change away is to unstage it first.
- **Result:**
