<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-001 — Manual sweep

Documentation review tickets. The tester needs a checkout of this branch and a
terminal; no running application is required.

| Field | Meaning |
| --- | --- |
| Priority | P1 blocks the item, P2 should be fixed before release, P3 cosmetic |
| Result | left blank for the tester: pass / fail |

---

### SWEEP-T001-01 — Every shipped item has four documents

- **Priority:** P1
- **Preconditions:** Branch checked out.
- **Steps:** For each ID marked **Done** in `agile/README.md`, check that
  `agile/items/<ID>-*.md`, `agile/plans/<ID>-plan.md`,
  `agile/testing/<ID>-automated.md` and `agile/testing/<ID>-sweep.md` all exist.
- **Expected:** No file missing for FEAT-001, FEAT-002 or TASK-001.
- **Result:**

### SWEEP-T001-02 — The index matches the directory

- **Priority:** P1
- **Preconditions:** Branch checked out.
- **Steps:** Compare the index table in `agile/README.md` against
  `ls agile/items`.
- **Expected:** Every file is listed, every listed link resolves, and no ID
  appears twice.
- **Result:**

### SWEEP-T001-03 — Retroactive documents say so

- **Priority:** P1
- **Preconditions:** Branch checked out.
- **Steps:** Read the header of each FEAT-001 and FEAT-002 document.
- **Expected:** Each states that it was written retroactively under TASK-001 and
  reconstructed from the code. None presents itself as contemporaneous.
- **Result:**

### SWEEP-T001-04 — Architecture document matches the code

- **Priority:** P1
- **Preconditions:** Branch checked out.
- **Steps:** For every file path, module, command name and constant named in
  `docs/architecture.md`, confirm it exists — `grep` or open it.
- **Expected:** Nothing named is missing or renamed. The command list matches
  the `invoke_handler` list in `src-tauri/src/lib.rs`.
- **Result:**

### SWEEP-T001-05 — Screens document matches the routes

- **Priority:** P2
- **Preconditions:** Branch checked out.
- **Steps:** Compare `docs/screens.md` against `src/routes/` and the
  `NAV_ITEMS` list in `src/lib/nav.ts`.
- **Expected:** Every route has a section; every screen code (1A to 1L) appears
  exactly once; the state column matches reality — only Graph and Diff are
  built.
- **Result:**

### SWEEP-T001-06 — The fixture script runs

- **Priority:** P1
- **Preconditions:** A shell, `git` on PATH, an empty scratch directory.
- **Steps:** Follow `docs/testing.md` exactly to build the fixture repository.
- **Expected:** It completes without an error. The resulting repository has the
  branches, tags, stash entries, binary file and dirty working copy the document
  claims.
- **Result:**

### SWEEP-T001-07 — Test counts are real

- **Priority:** P2
- **Preconditions:** Branch checked out.
- **Steps:** Run `cargo test --workspace` and compare against the run results
  quoted in the two automated-test documents.
- **Expected:** The counts match: 14 passed, 0 failed. Every named test exists.
- **Result:**

### SWEEP-T001-08 — No source was touched

- **Priority:** P1
- **Preconditions:** Branch checked out.
- **Steps:** Run `git diff --stat <previous commit> HEAD`.
- **Expected:** Only files under `agile/` and `docs/` appear, plus `README.md`,
  whose only change is a Documentation section linking to them.
- **Result:**
