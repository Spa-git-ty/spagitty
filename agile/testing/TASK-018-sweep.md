<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-018 — Manual sweep

| Field | Meaning |
| --- | --- |
| Priority | P1 blocks the item, P2 should be fixed before release, P3 cosmetic |
| Result | left blank for the tester: pass / fail |

This sweep is read against the forge's Actions tab. It checks that the pipeline
behaved the way Amendment 16 says it must — not that the code is good, which is
what the gates themselves are for.

---

### SWEEP-018-01 — The gates actually fired

- **Priority:** P1
- **Preconditions:** A pull request into `dev` is open.
- **Steps:** Open the pull request's checks, or run `gh pr checks`.
- **Expected:** A `gates` run is attached to the pull request. Gates 1 to 4 are
  listed. This is the ticket that fails if the workflow never triggered at all,
  which is the state the repository has been in until now.
- **Result:**

### SWEEP-018-02 — They ran in order, and a red one stopped the rest

- **Priority:** P1
- **Steps:** Open the run's graph view.
- **Expected:** `1 · licenses` → `2 · code quality` → `3 · tests and coverage` →
  `4 · security`, each depending on the one before. If any failed, everything
  after it is skipped rather than run.
- **Result:**

### SWEEP-018-03 — Gates 5 and 6 did not run

- **Priority:** P1
- **Steps:** Look for `5 · build` and `6 · release` in the same run.
- **Expected:** Both skipped. They are `main`-only and this is a pull request
  into `dev`. A build or a release triggered from here is a serious defect in the
  workflow, not a convenience.
- **Result:**

### SWEEP-018-04 — Nothing was bypassed

- **Priority:** P1
- **Steps:** Read the diff of every commit made in response to a red gate, and
  compare with the failure table in this item's automated document.
- **Expected:** No `continue-on-error`, no step deleted or commented out, no
  blanket `allow` added to `deny.toml`, and no gate re-run without a change in
  between. Every red has a row naming the item that fixed it.
- **Result:**

### SWEEP-018-05 — An advisory exception is recorded by id

- **Priority:** P1
- **Preconditions:** Only if gate 4 produced an advisory that could not be fixed.
- **Steps:** Read `deny.toml`.
- **Expected:** The exception names the advisory id and the crate, and carries a
  reason in a comment. A wildcard, or an id with no reason, fails this ticket.
- **Result:**

### SWEEP-018-06 — The secret scan walked the history

- **Priority:** P1
- **Steps:** Open gate 4's log and find the `gitleaks detect` step.
- **Expected:** It scanned commits, not just the working tree, and it reports the
  number it walked. A licence error, or a step that exited without scanning, is a
  failure of this ticket even though the gate is green — a scanner that never
  started proves nothing.
- **Result:**

### SWEEP-018-07 — `docs/ci.md` stops claiming it has never run

- **Priority:** P2
- **Preconditions:** Gates 1 to 4 have run.
- **Steps:** Read the top of `docs/ci.md`.
- **Expected:** The "Not yet running" paragraph is gone, replaced by what
  actually happened: when the first run was, what it found, and what is still
  unproven — gates 5 and 6, which need `main`.
- **Result:**

### SWEEP-018-08 — The runner and this machine agree

- **Priority:** P3
- **Steps:** Compare the local stand-in results in this item's automated document
  with the runner's.
- **Expected:** They match. Where they do not, the difference is written down in
  `docs/ci.md` — a check that passes here and fails there is a fact about the
  pipeline that the next person should not have to rediscover.
- **Result:**
