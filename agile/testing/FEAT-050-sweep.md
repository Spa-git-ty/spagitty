<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-050 — Manual sweep

| Field | Meaning |
| --- | --- |
| Priority | P1 blocks the item, P2 should be fixed before release, P3 cosmetic |
| Result | left blank for the tester: pass / fail |

**Use a throwaway clone with a messy history** — one that has been rebased,
reset and had branches deleted. A pristine repository has a reflog too boring to
test against.

---

### SWEEP-050-01 — The numbering agrees with git

- **Priority:** P1
- **Steps:** Open Reflog. Compare the first ten rows with `git reflog` in a
  terminal. Then copy one row's revision — `HEAD@{4}` — and run
  `git show HEAD@{4}` .
- **Expected:** The same entries, the same order, the same messages. The commit
  git shows is the one the row's "to" id names. **This is the assertion the
  whole screen rests on.**
- **Result:**

### SWEEP-050-02 — Switching between HEAD and a branch

- **Priority:** P1
- **Steps:** Note how many entries HEAD has. Click a branch chip.
- **Expected:** The list changes, the header names the branch, and the count is
  usually smaller — HEAD records checkouts as well. No remote-tracking refs are
  offered as chips.
- **Result:**

### SWEEP-050-03 — Recovering a deleted branch

- **Priority:** P1
- **Steps:** Create a branch with a commit on it that is nowhere else, then
  delete it from the Branches screen (forcing past the warning). Come to Reflog,
  find the entry, press **branch here**.
- **Expected:** The commit is found, the branch is recreated at it, and the
  graph shows it. This is the journey the whole item exists for.
- **Result:**

### SWEEP-050-04 — Undoing a bad reset

- **Priority:** P1
- **Steps:** Reset a branch back three commits from the graph. Come to Reflog,
  find the `reset:` entry, and use **reset here** on the entry *above* it — the
  one where the branch still had them.
- **Expected:** The dialog warns that uncommitted work is not in any reflog.
  Afterwards the commits are back.
- **Result:**

### SWEEP-050-05 — Reset warns about the thing that really is lost

- **Priority:** P1
- **Steps:** Make an uncommitted change. Read the reset dialog carefully before
  dismissing it.
- **Expected:** It says commits it moves past are still in the reflog, and that
  uncommitted changes are not in any reflog and will be lost. Dismissing leaves
  the change alone.
- **Result:**

### SWEEP-050-06 — A repository that keeps no reflog

- **Priority:** P2
- **Steps:** In a throwaway repository run `git config core.logAllRefUpdates
  false` and delete `.git/logs`. Open Reflog.
- **Expected:** It says this ref has no reflog and explains why, rather than
  showing an empty list that looks like a bug.
- **Result:**

### SWEEP-050-07 — The filter

- **Priority:** P2
- **Steps:** Type `rebase`, then `reset`, then clear it.
- **Expected:** Only matching rows, the footer counts what is hidden, and
  clearing brings everything back. A rebase's several steps all match `rebase`.
- **Result:**

### SWEEP-050-08 — Check out an entry and come back

- **Priority:** P2
- **Steps:** Use **check out** on an old entry, look at the graph, then check
  out a branch again from Branches.
- **Expected:** The head is detached and says so somewhere visible; checking out
  a branch puts everything back, exactly as the dialog promised.
- **Result:**

### SWEEP-050-09 — A newly created ref

- **Priority:** P3
- **Steps:** Create a branch, switch to it, and look at its own reflog.
- **Expected:** Its oldest entry says "created at" rather than showing
  `0000000` as though it were a commit.
- **Result:**

### SWEEP-050-10 — The list stays current

- **Priority:** P2
- **Steps:** With Reflog open, make a commit from the Working copy screen, then
  come back and Refresh.
- **Expected:** The new entry is at the top as `HEAD@{0}` and everything below
  it has shifted down by one.
- **Result:**
