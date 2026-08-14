<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-001 — Records baseline

**Status:** Done.
**Branch:** `task/TASK-001-records-baseline`.

## Problem

`agile/` existed as three empty directories. Two screens had shipped without a
work item, a plan or a test plan, and ten more were about to be built. `docs/`
held nothing but the pointer to the amendments book: no architecture document,
no per-screen documentation, no note of how the app is tested.

Amendment 12 treats an implemented item with no plan and no test plans as an
incomplete record, and Amendment 11 requires `docs/` to describe the design and
stay true to the code.

## Motivation

The record has to exist before the ten remaining screens are built, not after.
Written afterwards it would be a reconstruction — which is exactly what the
FEAT-001 and FEAT-002 documents in this change had to be, and they say so.

## Scope

- `agile/README.md`: the directory's own conventions and the item index.
- Backfilled quadruplets for FEAT-001 (Graph) and FEAT-002 (Diff), each marked
  as written retroactively.
- This item's own quadruplet.
- Item documents for the work ahead: TASK-002, FEAT-003 to FEAT-012.
- Backlog item documents for the deferred destructive work: FEAT-013 to
  FEAT-018.
- `docs/architecture.md`, `docs/screens.md`, `docs/testing.md`.

## Non-scope

- Plans and test plans for work that has not started. A plan written before the
  work is a guess, not a record; each is written on its item's own branch.
- Any change to code. This item is documentation only.

## Acceptance criteria

1. Every shipped item has all four documents.
2. Every planned and backlog item has an item document, and the index in
   `agile/README.md` lists them all with a status.
3. The retroactive documents say plainly that they are retroactive.
4. `docs/architecture.md` describes the three layers and the `gix`/`git`
   boundary, and matches the code as it stands.
5. `docs/screens.md` lists all twelve screens with their code, route and state.
6. `docs/testing.md` records how the fixture repository is built and how the
   app is run for a visual sweep.
7. No source file is touched; `cargo test` and `npm run check` results are
   unchanged.

## Dependencies

None. It follows FEAT-002 on the branch stack only so that FEAT-002's record can
describe a commit that exists.
