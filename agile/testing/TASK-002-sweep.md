<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-002 — Manual sweep

The tester needs a checkout of this branch, a terminal, `git`, Node 20+ and a
Rust toolchain. No running application is required: this item adds no UI.

| Field | Meaning |
| --- | --- |
| Priority | P1 blocks the item, P2 should be fixed before release, P3 cosmetic |
| Result | left blank for the tester: pass / fail |

---

### SWEEP-T002-01 — The suites pass from a clean checkout

- **Priority:** P1
- **Preconditions:** A fresh clone of this branch. No `node_modules`, no
  `target`.
- **Steps:**
  1. `npm ci`
  2. `npm test`
  3. `cargo test --workspace`
- **Expected:** 302 frontend tests pass in 19 files. 81 Rust tests pass. No
  test is skipped or ignored.
- **Result:**

### SWEEP-T002-02 — Coverage clears the floor and is enforced

- **Priority:** P1
- **Preconditions:** As above, plus `cargo install cargo-llvm-cov`.
- **Steps:**
  1. `npm run coverage`
  2. `cargo llvm-cov --workspace --ignore-filename-regex 'fixture\.rs' --summary-only`
- **Expected:** The frontend reports above 70% on all four measures and the
  command exits 0. Rust reports above 70% regions and lines.
- **Result:**

### SWEEP-T002-03 — The floor actually fails a run

- **Priority:** P1
- **Preconditions:** As above.
- **Steps:**
  1. Temporarily set `thresholds.statements` in `vite.config.ts` to `99.9`.
  2. `npm run coverage`
  3. Put it back.
- **Expected:** Step 2 exits non-zero and names the threshold. A floor that only
  prints a number is not a gate.
- **Result:**

### SWEEP-T002-04 — Quality gate is clean

- **Priority:** P1
- **Steps:**
  1. `cargo fmt --all --check`
  2. `cargo clippy --workspace --all-targets -- -D warnings`
  3. `npm run check`
- **Expected:** All three exit 0 with no diff, no warning and no type error.
- **Result:**

### SWEEP-T002-05 — Tests fail when the code is wrong

- **Priority:** P1
- **Preconditions:** A checkout you are willing to edit and revert.
- **Steps:**
  1. In `src/lib/diff/split.ts`, delete the `flush()` call inside the loop.
     Run `npm test`.
  2. Revert. In `src/lib/nav.ts`, change `isActive` to plain `startsWith`.
     Run `npm test`.
  3. Revert. In `crates/gitlumiere-core/src/refs.rs`, remove the `peel_to_id`
     call's effect by skipping tags. Run `cargo test --workspace`.
  4. Revert everything.
- **Expected:** Each break fails at least one test, with a message that points
  at what actually broke. A suite that passes with the code broken is not a
  suite.
- **Result:**

### SWEEP-T002-06 — Fixtures leave nothing behind

- **Priority:** P1
- **Steps:**
  1. Note the contents of your temporary directory.
  2. `cargo test --workspace`
  3. Check the temporary directory again, and run `git status` in this
     repository.
- **Expected:** No fixture directory survives the run. This repository's
  working copy is untouched — tests never write outside their own temp dir.
- **Result:**

### SWEEP-T002-07 — Tests do not depend on the machine's git identity

- **Priority:** P2
- **Preconditions:** A machine with a `user.name` different from the fixture's.
- **Steps:** `cargo test --workspace`
- **Expected:** Everything passes. Fixtures set their own identity, and no test
  asserts on the tester's.
- **Result:**

### SWEEP-T002-08 — The workflow files are valid

- **Priority:** P2
- **Preconditions:** `actionlint` available, or a forge to push a branch to.
- **Steps:** Run `actionlint` over `.github/workflows/`, or push the branch and
  read the run.
- **Expected:** No syntax error, no unknown action, no undefined reference.
  This has never run for real — treat a failure here as expected work, not as a
  surprise.
- **Result:**

### SWEEP-T002-09 — The license gate agrees with the tree

- **Priority:** P2
- **Preconditions:** `cargo install cargo-deny`.
- **Steps:** `cargo deny check licenses bans sources`
- **Expected:** Passes. Any dependency whose license is not on the `deny.toml`
  allow-list is named — which is the gate doing its job and needs a decision,
  not a wider allow-list by reflex.
- **Result:**

### SWEEP-T002-10 — Documentation matches what runs

- **Priority:** P2
- **Steps:** Read `docs/ci.md` beside `.github/workflows/gates.yml`.
- **Expected:** Every command in the table appears in the workflow; the gate
  order matches; the branch behaviour described (`main` all six, `dev` stopping
  after four) matches the `if:` conditions.
- **Result:**
