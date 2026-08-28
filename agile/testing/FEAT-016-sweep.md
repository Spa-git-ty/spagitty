<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-016 — Manual sweep

| Field | Meaning |
| --- | --- |
| Priority | P1 blocks the item, P2 should be fixed before release, P3 cosmetic |
| Result | left blank for the tester: pass / fail |

**Use a throwaway clone.** The conflict fixture in
[`docs/testing.md`](../../docs/testing.md) is the starting point; a second
conflicted file makes -05 and -09 worth doing.

---

### SWEEP-016-01 — Take a whole side

- **Priority:** P1
- **Steps:** With a conflicted file open, press **Take theirs**. Look at the
  file in an editor, and at `git status`.
- **Expected:** The file is exactly the incoming version, with no markers. The
  path is **still listed as conflicted** — taking a side is not resolving it.
- **Result:**

### SWEEP-016-02 — Resolve one region at a time

- **Priority:** P1
- **Steps:** Make a file with three separate conflicts. Take ours on the first,
  theirs on the second, leave the third.
- **Expected:** The bar counts three, then two, then one. Each choice keeps the
  right lines and removes only its own markers. The third conflict is untouched
  and still listed.
- **Result:**

### SWEEP-016-03 — Edit the merged result by hand

- **Priority:** P1
- **Steps:** Press **Edit**, type a resolution that is neither side, press
  **Save**. Open the file in an editor.
- **Expected:** The file contains exactly what was typed, byte for byte. Save is
  dead until something is actually changed.
- **Result:**

### SWEEP-016-04 — An unsaved edit is not lost by accident

- **Priority:** P1
- **Steps:** Start editing, type something, then try each of these in turn:
  press **Next**, click another file's chip, press **Refresh**.
- **Expected:** Next and the chip both ask first, and dismissing the question
  leaves you on the file with the text still there. **Refresh does not ask and
  does not lose the edit.**
- **Result:**

### SWEEP-016-05 — Mark resolved, file by file

- **Priority:** P1
- **Steps:** Resolve one of two conflicted files and press **Mark resolved**.
- **Expected:** That file leaves the list, the pager drops to one file, and
  `git status` shows it staged. Continue is still not offered.
- **Result:**

### SWEEP-016-06 — Finish a merge

- **Priority:** P1
- **Steps:** Resolve and mark every file. Read the screen, then press
  **Continue**.
- **Expected:** With the list empty the screen says every file is resolved and
  Continue becomes available. Pressing it makes the merge commit, and the graph
  shows a commit with two parents.
- **Result:**

### SWEEP-016-07 — Continue is not offered while it cannot work

- **Priority:** P2
- **Steps:** With a file still conflicted, hover **Continue**.
- **Expected:** Disabled, and the tooltip says to resolve every file first —
  not the word "disabled" and not a git error after the fact.
- **Result:**

### SWEEP-016-08 — Abort says what comes back

- **Priority:** P1
- **Steps:** Read the abort dialog during a merge, during a rebase, and during
  a cherry-pick. Abort the cherry-pick and check `git log`.
- **Expected:** Three different sentences. The cherry-pick one says the commits
  it already made stay — and `git log` agrees.
- **Result:**

### SWEEP-016-09 — A file changed underneath an open draft

- **Priority:** P2
- **Steps:** Start editing the merged pane. In a terminal, write something else
  into the same file. Press Save.
- **Expected:** The draft wins and the terminal's version is overwritten. This
  is known and not detected; the test exists so the behaviour is a decision
  rather than a surprise.
- **Result:**

### SWEEP-016-10 — A conflict with no markers

- **Priority:** P2
- **Steps:** Create a delete/modify conflict — one side deletes a file, the
  other changes it. Open it.
- **Expected:** The bar says there are no markers in this file, and Take ours,
  Take theirs and Mark resolved all still work.
- **Result:**

### SWEEP-016-11 — Handed over from a rebase

- **Priority:** P1
- **Steps:** From the Rebase screen, run a rebase that conflicts, follow
  **Resolve conflicts**, resolve, mark, and return.
- **Expected:** This screen says "rebase in progress", aborting offers the
  rebase wording, and going back to the Rebase screen lets Continue carry on
  from where git stopped.
- **Result:**

### SWEEP-016-12 — The command log shows the real invocations

- **Priority:** P3
- **Steps:** Take a side, mark resolved, continue. Open the command log.
- **Expected:** `checkout --ours`, `add`, and `merge --continue` are all there
  with their paths, the same as every other write.
- **Result:**
