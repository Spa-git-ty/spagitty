<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-015 — Manual sweep

| Field | Meaning |
| --- | --- |
| Priority | P1 blocks the item, P2 should be fixed before release, P3 cosmetic |
| Result | left blank for the tester: pass / fail |

**Use a throwaway clone.** Every test here rewrites history.

The conflict fixture in [`docs/testing.md`](../../docs/testing.md) is the
starting point for -03 onwards; a branch of two commits that both touch a line
also changed on the upstream is enough.

---

### SWEEP-015-01 — Apply says what it will do before it does it

- **Priority:** P1
- **Steps:** Plan a rebase of several commits. Press Apply. Read the dialog and
  dismiss it. Check `git log` in a terminal.
- **Expected:** The dialog names the branch, how many commits move, that they
  get new ids, and the 30 days. Dismissing changes nothing at all.
- **Result:**

### SWEEP-015-02 — Progress moves

- **Priority:** P1
- **Steps:** Plan a rebase of at least ten commits onto something that will not
  conflict. Confirm, and watch.
- **Expected:** The plan is replaced by a step count and a bar. The count climbs
  and reaches the total. The bar never goes backwards, and never sits at zero
  for the whole run.
- **Result:**

### SWEEP-015-03 — A conflict is a hand-off, not an error

- **Priority:** P1
- **Steps:** Rebase a branch that will conflict. Watch what the screen does when
  git stops.
- **Expected:** It says git stopped, at which commit of how many. It does **not**
  read as a failure. There is a Resolve conflicts button, a Continue, a skip and
  an abort.
- **Result:**

### SWEEP-015-04 — Resolve, continue, finish

- **Priority:** P1
- **Steps:** From the stopped state, press Resolve conflicts, fix the file (in
  an editor if the Conflicts screen still cannot write — FEAT-016), stage it,
  come back, press Continue.
- **Expected:** The rebase carries on. If it stops again, the screen says so at
  the new step. When it finishes, the footer says so and the graph shows the
  rebuilt branch.
- **Result:**

### SWEEP-015-05 — Abort puts everything back

- **Priority:** P1
- **Steps:** Note `git rev-parse HEAD` before starting. Rebase into a conflict,
  resolve one file, then abort.
- **Expected:** The dialog warns that the resolutions go too. Afterwards `HEAD`
  is exactly what it was, the working tree is clean, and there is no rebase in
  progress.
- **Result:**

### SWEEP-015-06 — Skip drops the commit it stopped on

- **Priority:** P2
- **Steps:** From a stop, press skip and confirm.
- **Expected:** That commit's changes are not in the result, and the rebase
  carries on to the next.
- **Result:**

### SWEEP-015-07 — A rebase already in progress on arrival

- **Priority:** P1
- **Steps:** Start a conflicting `git rebase -i` in a terminal and leave it
  stopped. Open Spagitty, go to the Rebase screen.
- **Expected:** The screen is in the stopped state immediately, with the right
  step count — not the planning form as though nothing were happening. Continue
  and abort both work on it.
- **Result:**

### SWEEP-015-08 — The rebase survives leaving the screen

- **Priority:** P1
- **Steps:** Start a long rebase and immediately navigate to the Graph, then to
  Branches, then back.
- **Expected:** It is still running, and the progress on the Rebase screen has
  kept up rather than restarting from where it was left.
- **Result:**

### SWEEP-015-09 — Closing mid-rebase leaves the terminal able to finish

- **Priority:** P1
- **Steps:** Start a rebase that will stop on a conflict. When it stops, quit
  Spagitty. In a terminal, run `git status` and then `git rebase --abort`.
- **Expected:** git recognises the rebase, describes it normally, and aborts it
  cleanly. Nothing Spagitty left behind confuses it.
- **Result:**

### SWEEP-015-10 — Apply refuses what it cannot run

- **Priority:** P2
- **Steps:** Build a plan the preview refuses — a `squash` as the first row, or
  a `fixup` with nothing above it. Hover Apply.
- **Expected:** Apply is disabled and its tooltip is the preview's own reason,
  not the word "disabled".
- **Result:**

### SWEEP-015-11 — The command log shows the real invocation

- **Priority:** P3
- **Steps:** After a rebase, open the command log.
- **Expected:** `rebase --interactive <upstream>` is there, along with any
  `--continue` or `--abort`, the same as every other write.
- **Result:**
