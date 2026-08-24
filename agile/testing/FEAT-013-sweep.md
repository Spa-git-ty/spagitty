<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-013 — Manual sweep

| Field | Meaning |
| --- | --- |
| Priority | P1 blocks the item, P2 should be fixed before release, P3 cosmetic |
| Result | left blank for the tester: pass / fail |

**Use a throwaway clone.** SWEEP-013-03 deletes commits on purpose.

---

### SWEEP-013-01 — Deleting a merged branch

- **Priority:** P1
- **Steps:** On Branches, find a dashed row. Press Delete, read the dialog,
  dismiss it, then do it again and confirm.
- **Expected:** The dialog says nothing is lost and is not painted as
  destructive. Dismissing changes nothing. Confirming removes the row, and the
  count in the header goes down by one.
- **Result:**

### SWEEP-013-02 — The branch you are standing on

- **Priority:** P1
- **Steps:** Look at the current row. Try to press its Delete.
- **Expected:** It is not a button. Hovering says "This is the branch you have
  checked out". Nothing happens on click.
- **Result:**

### SWEEP-013-03 — Deleting an unmerged branch, and getting it back

- **Priority:** P1
- **Steps:** Make a branch with a commit on it that is nowhere else. Delete it
  from the Branches screen. **Write down the command the dialog shows.** Confirm.
  Then run that command in a terminal.
- **Expected:** The dialog is red, names the commits as being on no other
  branch, and shows `git branch <name> <id>` with a real id. After confirming
  the branch is gone. After running the command it is back, at the same commit.
- **Result:**

### SWEEP-013-04 — Renaming carries the upstream

- **Priority:** P1
- **Steps:** Rename a branch that tracks a remote. Then look at its row, and at
  `git branch -vv` in a terminal.
- **Expected:** The new name is in the table with the same `→ upstream` marker,
  and the divergence bar reads the same as before. The remote still has the old
  name, which the dialog said it would.
- **Result:**

### SWEEP-013-05 — The merged cleanup shows its list

- **Priority:** P1
- **Steps:** With several merged branches present, press **Delete merged** at
  the bottom of the screen.
- **Expected:** Every name is in the dialog, one per line — not a count. The
  current branch is not among them, however merged it is. Confirming removes
  exactly those.
- **Result:**

### SWEEP-013-06 — A cleanup that has gone stale

- **Priority:** P2
- **Steps:** Open **Delete merged** and leave the dialog up. In a terminal, add
  a commit to one of the listed branches. Then confirm.
- **Expected:** The run stops at that branch with git's own "not fully merged"
  in the footer. Branches before it in the list are gone; nothing was forced.
- **Result:**

### SWEEP-013-07 — The cleanup row is absent when there is nothing to clean

- **Priority:** P3
- **Steps:** Filter, or use a repository, so that no branch but the current one
  is merged.
- **Expected:** No **Delete merged** row at all — not a disabled button.
- **Result:**

### SWEEP-013-08 — The graph says the same thing

- **Priority:** P2
- **Steps:** Delete an unmerged branch from the graph's branch label instead.
- **Expected:** The same sentence about what is lost and how to get it back,
  word for word, as the Branches screen gives.
- **Result:**

### SWEEP-013-09 — Nothing is pressable twice

- **Priority:** P2
- **Steps:** On a slow repository, confirm a delete and immediately try to press
  Delete or Rename on another row.
- **Expected:** Every button and chip in the table is dead until the write
  finishes and the list has been re-read.
- **Result:**
