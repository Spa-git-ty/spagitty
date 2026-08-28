<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-052 — Manual sweep

| Field | Meaning |
| --- | --- |
| Priority | P1 blocks the item, P2 should be fixed before release, P3 cosmetic |
| Result | left blank for the tester: pass / fail |

**This item cannot be signed off against the standard fixture.** Eleven commits
and four branches is what hid the problem in the first place. Every check below
needs a genuinely deep history:

```sh
git clone https://github.com/git/git /tmp/spagitty-deep
```

`git/git` is the repository the item was raised against: a mean lane depth of
187 and a peak of 382.

---

### SWEEP-052-01 — The graph is a graph

- **Priority:** P1
- **Steps:** Open `/tmp/spagitty-deep`, show all branches, and scroll through a
  few hundred commits.
- **Expected:** Individual lanes can be followed from one row to the next. It
  will still be busy — 382 lanes defeat any width — but it reads as lines rather
  than as a single band. Compare against the screenshot in the item.
- **Result:**

### SWEEP-052-02 — The ref column reads as a column

- **Priority:** P1
- **Steps:** Scroll to a region with refs on several rows.
- **Expected:** Every row's first chip starts at the same x. The left edge of
  the column is straight.
- **Result:**

### SWEEP-052-03 — The edges say where there is more

- **Priority:** P1
- **Steps:** Drag the message column until the table is wider than the window.
  Scroll fully left, then to the middle, then fully right.
- **Expected:** Fully left — right edge shaded, left clear. Middle — both.
  Fully right — left shaded, right clear. Narrow the columns until nothing
  overflows: both gone. Then click a row underneath an edge; it selects.
- **Result:**

### SWEEP-052-04 — Nodes still sit in their own lanes

- **Priority:** P1
- **Steps:** In the deepest part of the history, look at rows where many lanes
  are active.
- **Expected:** Every commit node is inside its own lane and does not cover a
  neighbouring line. This used to fail past 32 lanes by design; it should now
  hold everywhere.
- **Result:**

### SWEEP-052-05 — The shallow case is unchanged

- **Priority:** P1
- **Steps:** Open the ordinary fixture from `docs/testing.md`.
- **Expected:** Identical to before — at four lanes the pitch never compresses,
  so nothing here should have moved except the ref chips' alignment.
- **Result:**

### SWEEP-052-06 — Both grounds

- **Priority:** P2
- **Steps:** Repeat SWEEP-052-03 in light and in dark, and in two other themes.
- **Expected:** The edge is visible against the rows in every theme and never
  strong enough to be mistaken for a border or a selected row.
- **Result:**
