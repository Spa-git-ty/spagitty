<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# Working record

This directory is the working record of what is being built, as required by
Amendment 12 of the amendments book (`docs/AMENDMENTS.md` points at the
canonical copy).

```
agile/
  items/     work items: features, tasks, bugs
  plans/     one implementation plan per work item
  testing/   test plans per work item — automated and manual sweep
```

Identifiers are `FEAT-###`, `TASK-###` and `BUG-###`, assigned in sequence and
never reused. The identifier is the join key: an item's four documents are

```
agile/items/FEAT-004-<short-kebab-description>.md
agile/plans/FEAT-004-plan.md
agile/testing/FEAT-004-automated.md
agile/testing/FEAT-004-sweep.md
```

and its branch is `feature/FEAT-004-<short-kebab-description>`.

Backlog items — recorded but not started — carry an item document only. Their
plan and testing documents are written when the work begins, since a plan
written before the work is a guess rather than a record.

## Index

| ID | Title | Screen | Status |
| --- | --- | --- | --- |
| [FEAT-001](items/FEAT-001-graph-screen.md) | Graph screen | 1A | Done |
| [FEAT-002](items/FEAT-002-diff-screen.md) | Diff screen | 1B | Done |
| [TASK-001](items/TASK-001-records-baseline.md) | Records baseline | — | Done |
| [TASK-002](items/TASK-002-test-and-ci-baseline.md) | Test and CI baseline | — | Done |
| [FEAT-003](items/FEAT-003-working-copy.md) | Working copy / Commit | 1C | Done |
| [FEAT-004](items/FEAT-004-branches.md) | Branches | 1F | Done |
| [FEAT-005](items/FEAT-005-stash.md) | Stash | 1G | Done |
| [FEAT-006](items/FEAT-006-all-repositories.md) | All repositories | 1J | Done |
| [FEAT-007](items/FEAT-007-log-search.md) | Log search | 1I | Done |
| [FEAT-008](items/FEAT-008-conflicts.md) | Conflicts | 1D | Done |
| [FEAT-009](items/FEAT-009-rebase.md) | Interactive rebase | 1E | Planned |
| [FEAT-010](items/FEAT-010-pull-requests.md) | Pull requests | 1H | Planned |
| [FEAT-011](items/FEAT-011-settings.md) | Settings | 1K | Planned |
| [FEAT-012](items/FEAT-012-clone.md) | Clone | 1L | Planned |
| [FEAT-013](items/FEAT-013-branch-destructive-operations.md) | Branch delete and rename | 1F | Backlog |
| [FEAT-014](items/FEAT-014-stash-pop-apply-drop.md) | Stash pop, apply, drop | 1G | Backlog |
| [FEAT-015](items/FEAT-015-rebase-execution.md) | Rebase execution | 1E | Backlog |
| [FEAT-016](items/FEAT-016-conflict-resolution-writes.md) | Conflict resolution writes | 1D | Backlog |
| [FEAT-017](items/FEAT-017-forge-integration.md) | Forge integration | 1H | Backlog |
| [FEAT-018](items/FEAT-018-fetch-and-push.md) | Fetch and push | chrome | Backlog |
| [TASK-003](items/TASK-003-runtime-generic-tauri-layer.md) | Runtime-generic Tauri layer | — | Backlog |
| [BUG-001](items/BUG-001-type-errors-shipped-in-task-002.md) | Type errors shipped in TASK-002 | — | Fixed |
