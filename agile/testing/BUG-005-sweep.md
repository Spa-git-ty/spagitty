<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-005 — Manual sweep

| Field | Meaning |
| --- | --- |
| Priority | P1 blocks the item, P2 should be fixed before release, P3 cosmetic |
| Result | left blank for the tester: pass / fail |

---

### SWEEP-005-01 — Line spacing is the design's, not the browser's

- **Priority:** P1
- **Preconditions:** A repository with multi-line commit messages and a diff with
  a long file. Zoom and text size at 100%.
- **Steps:**
  1. Open the Graph screen and read a column of commit subjects.
  2. Open a commit's detail panel and read a wrapped message body.
  3. Open the Diff screen and read a screenful of code lines.
  4. Open Settings and read a section of labels and descriptions.
- **Expected:** Lines sit at consistent, deliberate spacing throughout — roughly
  a third of the type size between them. The regression this ticket guards
  against looks like text that is either cramped against itself or floating
  apart, and it appears everywhere at once, since it comes from `body`.
- **Result:**

### SWEEP-005-02 — Spacing holds at both dials' extremes

- **Priority:** P2
- **Steps:** Repeat SWEEP-005-01 step 1 at text size 0.9 and at 1.3, and at zoom
  1.0 and 2.0.
- **Expected:** Spacing stays proportional at every setting — a unitless
  line-height scales with the font size, so no combination should crowd or
  stretch the rows.
- **Result:**

### SWEEP-005-03 — The suite is green from a clean checkout

- **Priority:** P1
- **Preconditions:** A fresh clone of this branch, `npm ci` run.
- **Steps:** Run `cargo fmt --all -- --check`, `cargo clippy --workspace
  --all-targets -- -D warnings`, `cargo test --workspace`, `npm run check`, and
  `npm test`.
- **Expected:** All pass. 312 Rust tests, 824 frontend tests, 0 type errors.
  `npm run coverage` still reports branch coverage below the 70% threshold —
  that is TASK-005, and is **not** a failure of this ticket.
- **Result:**

### SWEEP-005-04 — The mirror guard actually guards

- **Priority:** P2
- **Steps:**
  1. Change `ROW_PITCH` in `src/lib/metrics.ts` to any other number.
  2. Run `cargo test --workspace`.
  3. Put it back and run again.
- **Expected:** Step 2 fails `row_pitch_matches_the_frontend` with a message
  naming both values. Step 3 is green. A pass in step 2 means the guard is not
  reading the file it claims to.
- **Result:**

### SWEEP-005-05 — The working tree is quiet

- **Priority:** P3
- **Steps:** With the IDE open on the project, run `git status`.
- **Expected:** Nothing from `.idea/` listed, and `design_handoff_gitlord/` is
  tracked rather than untracked. Opening or reconfiguring the IDE does not make
  new untracked files appear.
- **Result:**

### SWEEP-005-06 — The comments match the code

- **Priority:** P3
- **Steps:** Read `src/lib/metrics.ts` top to bottom against the constants it
  declares, then `docs/screens.md`'s Graph geometry paragraph.
- **Expected:** Every number in prose matches the number in code beside it —
  lane positions 16/42/68/94/120, node 22px across, five-lane column 149px,
  twelve-lane column 331px. Any that does not is this bug returning, and under
  Amendment 9 the second occurrence is a CODE ORANGE.
- **Result:**
