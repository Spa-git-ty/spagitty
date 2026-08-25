<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-033 — Manual sweep

| Field | Meaning |
| --- | --- |
| Priority | P1 blocks the item, P2 should be fixed before release, P3 cosmetic |
| Result | left blank for the tester: pass / fail |

Needs a repository with a branch that is both ahead of and behind its upstream.
Commit locally, and push a different commit from elsewhere — or reset the
remote-tracking ref by hand.

---

### SWEEP-033-01 — The drift is on the chip

- **Priority:** P1
- **Steps:** On the Graph, find the chip for a branch that has diverged.
- **Expected:** `↓` with the behind count and `↑` with the ahead count, beside
  the name. Hovering gives the whole sentence including the upstream's name.
- **Result:**

### SWEEP-033-02 — The chip and the Branches screen agree

- **Priority:** P1
- **Steps:** Note the numbers on the chip. Open Branches and read the same
  branch's bar and counts. Then run `git rev-list --left-right --count
  main...origin/main`.
- **Expected:** All three say the same thing. **This is the item's own
  criterion.**
- **Result:**

### SWEEP-033-03 — Which way round, and in which colour

- **Priority:** P2
- **Steps:** Compare the chip's two arrows with the Branches screen's bar for
  the same branch.
- **Expected:** Behind is the same colour in both and on the same side of the
  reading — left on the bar, first on the chip. Ahead likewise.
- **Result:**

### SWEEP-033-04 — A crowded gutter

- **Priority:** P2
- **Steps:** Narrow the Graph's Branch/Tag column with a diverged branch that
  has a long name on screen.
- **Expected:** The name truncates and the drift stays readable, or the whole
  chip collapses cleanly. Nothing overlaps and no row grows taller.
- **Result:**

### SWEEP-033-05 — Silence where there is nothing to say

- **Priority:** P1
- **Steps:** Look at a level branch, a branch with no upstream, a tag, and a
  remote-only chip.
- **Expected:** None of the four shows any arrows. The level one says "Level
  with …" when hovered; the others say nothing about drift at all.
- **Result:**

### SWEEP-033-06 — It moves when the world does

- **Priority:** P2
- **Steps:** With the Graph open, commit locally. Then fetch after somebody
  pushes.
- **Expected:** The ahead count goes up on the commit, and the behind count
  changes after the fetch. Both without a manual refresh.
- **Result:**

### SWEEP-033-07 — Everywhere a chip is drawn

- **Priority:** P3
- **Steps:** Look at the chips on All repositories, on the Stash screen and in
  Log search results.
- **Expected:** Nothing broke. The stash's branch label shows no drift — it is
  a label, not a live ref.
- **Result:**
