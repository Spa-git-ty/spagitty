<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-053 — Manual sweep

| Field | Meaning |
| --- | --- |
| Priority | P1 blocks the item, P2 should be fixed before release, P3 cosmetic |
| Result | left blank for the tester: pass / fail |

**A history with no crossings proves nothing here.** The standard fixture's
current branch is linear, and so is this repository's — every commit on lane 0
and not a transition on screen. Build one that braids:

```sh
rm -rf /tmp/spagitty-braid && mkdir -p /tmp/spagitty-braid && cd /tmp/spagitty-braid
git init -q -b main
git config user.name "Ada Lovelace" && git config user.email ada@example.com
echo base > f.txt && git add -A && git commit -qm "Base"
for b in alpha beta gamma delta epsilon; do
  git switch -q -c "topic/$b" main
  for i in 1 2 3; do echo "$b $i" >> "$b.txt"; git add -A; git commit -qm "$b: step $i"; done
  git switch -q main && git merge -q --no-ff "topic/$b" -m "Merge branch 'topic/$b'"
done
```

---

### SWEEP-053-01 — The turns are square

- **Priority:** P1
- **Steps:** Open the braided repository and look at any lane that changes
  column.
- **Expected:** Straight down its own lane, a tight rounded corner, straight
  across, another corner, straight down the new lane. No diagonal sweep and no
  S.
- **Result:**

### SWEEP-053-02 — The corner is a corner, not a curve or a mitre

- **Priority:** P2
- **Steps:** Look closely at one transition, zooming the application in with
  its own zoom if it helps.
- **Expected:** The radius reads as a rounded corner. It is not so large that
  the turn becomes a curve, and not so small that it looks like a sharp mitre
  joint against the stroke width.
- **Result:**

### SWEEP-053-03 — Close lanes turn tighter rather than bulging

- **Priority:** P1
- **Steps:** Open a deep repository — `git/git` — where the pitch is at its
  floor, and find a transition between neighbouring lanes.
- **Expected:** The corner is smaller than it is at the design pitch. It never
  overshoots its own lane or bulges past the corner into the neighbour.
- **Result:**

### SWEEP-053-04 — The stash lane matches the graph

- **Priority:** P2
- **Steps:** Open the Stash screen on a repository with an entry.
- **Expected:** The elbow joining the entry to the commit it was made on is the
  same shape as a branch elbow on the graph. A stash is drawn like a branch
  because it is one.
- **Result:**
