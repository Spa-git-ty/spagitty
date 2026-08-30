<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-029 — Candidate feature backlog items

**Status:** Done.
**Screens:** —.
**Raised by:** the author: "ok can you plan all of them".

## Problem

Following the release preparation of v0.2.0, Spagitty's recorded feature set
(FEAT-001 through FEAT-061) is completely built. The long tail of candidate
capabilities identified in `docs/analysis/gitkraken-gap.md` and `agile/roadmap.md`
had no formal work item specifications or tracking in `agile/items/`.

Under Amendment 12, work items must be given stable sequential identifiers and
recorded in the agile working record to establish clear scope, acceptance
criteria, and architectural boundaries before implementation begins.

## Change

- Author formal backlog specifications for candidate features:
  - `FEAT-062` — Worktrees management (1J, chrome)
  - `FEAT-063` — File history and blame view (1I, new view)
  - `FEAT-064` — Diff syntax highlighting (1B, 1C, 1G, 1H)
  - `FEAT-065` — Image and binary diffs (1B, 1C, 1G)
  - `FEAT-066` — Diff content search (1I)
  - `FEAT-067` — Submodules management (1F, settings)
  - `FEAT-068` — External diff and merge tool launchers (1K)
  - `FEAT-069` — Multi-identity profiles (1K, chrome)
  - `FEAT-070` — Extended forge integration (1H, 1K)
- Update `agile/README.md` to index all nine new backlog items and `TASK-029`.
- Update `agile/roadmap.md` to order and contextualize the new feature batch.
- Verify that `tools/record.test.ts` passes without drift or unresolved citations.

## Non-scope

- Implementing backend Rust or frontend Svelte code for FEAT-062 through FEAT-070.
- Creating implementation plans or test sweeps for backlog items before implementation starts (per Amendment 12).

## Acceptance criteria

- `bun run test tools/record.test.ts` passes cleanly.
- All nine feature specifications follow Spagitty's standard item structure with explicit problem statements, changes, non-scope, and acceptance criteria.
- `agile/README.md` and `agile/roadmap.md` accurately index the new backlog.
