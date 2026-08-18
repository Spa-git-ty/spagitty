<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-012 — The working record has drifted from the tree

**Status:** Done on `task/TASK-012-record-drift`.
**Surface:** `agile/`, and the references to it in `docs/`.
**Found by:** an audit of `agile/items/` against the code and the git history,
asked for on 2026-08-18.

## Problem

Amendment 12 makes `agile/` the working record. It is currently wrong in six
distinct ways, and each one costs the same thing: somebody reading it to decide
what to work on is told something false.

### 1. The index stops at BUG-001

`agile/README.md` lists twenty-two items. There are fifty-four. Everything from
FEAT-019 onwards — thirty-two items, including every item built in the last two
working sessions — is absent, and FEAT-014 is listed as `Backlog` when it
shipped.

The index is the only place the record can be read as a whole. An index that
covers 40% of the tree is worse than none, because it looks complete.

### 2. Four built items have one document instead of four

FEAT-036, FEAT-038, FEAT-039 and TASK-011 are all merged into `dev` and carry an
item document only. No plan, no automated test document, no sweep. Amendment 12
asks for four before an item is done, and it did not happen.

### 3. BUG-009b has no documents at all

It has a branch (`bugfix/BUG-009b-graph-divider-resizes-message`), a commit
(`51c62a0`), and two other items name it as adjacent work. It has never had an
item document.

### 4. Two shipped items still say "open, not started"

- **TASK-005** — shipped in `ff60d37`, and its own plan and testing documents
  exist and describe the finished work.
- **BUG-007** — shipped in `1a0c6db`.

Both are the highest-signal line in their document and both are false.

### 5. Three items describe work the tree has already done

- **FEAT-018 (fetch and push)** is marked `Backlog` and describes
  `shell::fetch` and `shell::push` as `unimplemented!()` stubs. Both are
  implemented (`ops::fetch`, `ops::push`), the commands exist
  (`commands.rs:517`, `commands.rs:530`), and the toolbar's buttons are live —
  it landed inside FEAT-038 without its own item being closed.
- **FEAT-013 (branch delete and rename)** is marked `Backlog`. `ops::delete_branch`
  and `ops::rename_branch` exist and are reachable from the graph's context menu.
  The Branches screen and the bulk merged-branch action are still missing, so it
  is *partly* built, which is a third state the record has no word for.
- **FEAT-015 (rebase execution)** is marked `Backlog`. `ops::rebase_interactive`
  and the `rebase_run` command are implemented; only the frontend is unwired —
  Apply is a hardcoded `disabled`.

An item that says `Backlog` when two thirds of it is merged sends whoever picks
it up to write code that is already there.

### 6. Four identifiers are named but do not exist

`FEAT-031`, `FEAT-033` and `FEAT-034` are cited as dependencies and as
non-scope by FEAT-014, FEAT-035, FEAT-036 and `docs/screens.md`. None has an
item document. `FEAT-024`, `FEAT-032` and `TASK-006` are cited nowhere and were
simply skipped.

Amendment 12 says identifiers are never reused. A cited identifier with no
document is therefore permanently ambiguous: a reader cannot tell whether the
document is missing or the identifier was never real.

## Why this happened

The last session ran three CI gate failures to ground and shipped eighteen items
across a stacked branch. The record was written for the items that had a
question worth recording and skipped for the ones that felt obvious at the time.
That is exactly the failure Amendment 12 exists to prevent, and it is invisible
until someone audits, because nothing checks it.

## Scope

- Rebuild the index over every item, with a status that matches the tree.
- Correct the five wrong statuses, and give partly-built work a word of its own.
- Write BUG-009b's four documents.
- Resolve the four dangling identifiers.
- **Add an automated check**, so this is a test failure next time rather than an
  audit.

## Non-scope

- The three missing document sets for FEAT-036, FEAT-038, FEAT-039 and TASK-011.
  Backfilling four plans and eight test documents is a session of writing on its
  own and none of it changes what anyone would do next; the index and the
  automated check both name them as incomplete, so the debt is recorded rather
  than hidden. That is **TASK-013**.
- Any change to code outside `tools/` and `vite.config.ts`.

## Acceptance

- Every item document has an index row, and every index row has an item document.
- No index status contradicts the tree.
- Every `FEAT-`, `TASK-` or `BUG-` identifier cited anywhere in `agile/` or
  `docs/` resolves to an item document.
- The automated check fails if any of the above stops being true.

## Dependencies

None.
