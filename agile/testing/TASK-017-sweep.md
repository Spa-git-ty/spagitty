<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-017 — Manual sweep

| Field | Meaning |
| --- | --- |
| Priority | P1 blocks the item, P2 should be fixed before release, P3 cosmetic |
| Result | left blank for the tester: pass / fail |

This sweep is read against the forge and against a fresh clone, not against the
application. Nothing here needs Spagitty to be running.

---

### SWEEP-017-01 — Every branch reached the remote

- **Priority:** P1
- **Preconditions:** The push has been run.
- **Steps:** `git ls-remote --heads origin | wc -l`, and compare with
  `git for-each-ref refs/heads | wc -l` locally.
- **Expected:** The remote count is at least the local one. Spot-check three
  branches from before the rename and confirm they are there.
- **Result:**

### SWEEP-017-02 — `dev` exists and is protected

- **Priority:** P1
- **Steps:** Open the repository's branch settings on the forge.
- **Expected:** `dev` is listed, and a protection rule covers it: no direct
  pushes, pull request required. `main` is protected the same way and is the
  author's alone.
- **Result:**

### SWEEP-017-03 — Nothing moved on `main`

- **Priority:** P1
- **Steps:** `git log --oneline -1 origin/main`, and check the tag list with
  `git ls-remote --tags origin`.
- **Expected:** `main` is exactly where it was, at the pre-rename commit. Both
  preview tags still point at the commits they always did. No new tag.
- **Result:**

### SWEEP-017-04 — The pull request says what it carries

- **Priority:** P1
- **Steps:** Open the pull request on the forge and read the body against the
  index in `agile/README.md`.
- **Expected:** Every item merged into the branch is named in the body, and no
  item is named that is not in it. The base is `dev` and the head is
  `task/TASK-017-flow-restore`.
- **Result:**

### SWEEP-017-05 — A fresh clone builds

- **Priority:** P1
- **Preconditions:** The pull request is merged into `dev`.
- **Steps:** Clone the repository into an empty directory, check out `dev`, then
  `npm ci && npm run check && npx vitest run` and `cargo test --workspace`.
- **Expected:** All green from a clone, with no file that only exists on the
  original machine. This is the ticket that catches a file that was never added.
- **Result:**

### SWEEP-017-06 — The archived commit is still reachable

- **Priority:** P2
- **Steps:** `git log --oneline -1 archive/origin-FEAT-040-graph-footer-facts`
  against the remote.
- **Expected:** The commit that the dead remote used to be the only reference to
  is still there, on the archive branch, on the forge.
- **Result:**

### SWEEP-017-07 — The record reads true from the forge

- **Priority:** P2
- **Steps:** Browse `agile/README.md` on `dev` in the forge's file viewer and
  click through five item links at random, including two from the merged stack.
- **Expected:** Every link resolves to a document that exists, and each one's
  status line says the same word as the index row.
- **Result:**
