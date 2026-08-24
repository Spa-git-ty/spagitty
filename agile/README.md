<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# Working record

This directory is the working record of what is being built, as required by
Amendment 12 of the amendments book (`docs/AMENDMENTS.md` points at the
canonical copy).

```
agile/
  items/       work items: features, tasks, bugs
  plans/       one implementation plan per work item
  testing/     test plans per work item — automated and manual sweep
  roadmap.md   the order the outstanding work is meant to be taken in
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

## Status

The first word of an item's `**Status:**` line is one of these, and it must be
the same word as the one in the index. Everything after it is prose.

| Word | Means |
| --- | --- |
| `Done` | Built and merged. |
| `Fixed` | A bug, fixed and merged. |
| `Partial` | Some of it is built and merged and some is not. The item says which. |
| `Open` | Being worked on now. |
| `Backlog` | Recorded, not started. Item document only. |

`Partial` exists because the record had no word for it and used `Backlog`
instead, which sent readers to write code that was already there (TASK-012).

## This index is checked

`tools/record.test.ts` runs in the ordinary test suite and fails if the index
and the tree disagree: a missing row, a row with no document, a status that does
not match the item, a cited identifier that resolves to nothing, or a built item
whose missing documents are not recorded below. Drift is a test failure now
rather than an audit.

## Features

| ID | Title | Screen | Status |
| --- | --- | --- | --- |
| [FEAT-001](items/FEAT-001-graph-screen.md) | Graph screen | 1A | Done |
| [FEAT-002](items/FEAT-002-diff-screen.md) | Diff screen | 1B | Done |
| [FEAT-003](items/FEAT-003-working-copy.md) | Working copy / Commit | 1C | Done |
| [FEAT-004](items/FEAT-004-branches.md) | Branches | 1F | Done |
| [FEAT-005](items/FEAT-005-stash.md) | Stash | 1G | Done |
| [FEAT-006](items/FEAT-006-all-repositories.md) | All repositories | 1J | Done |
| [FEAT-007](items/FEAT-007-log-search.md) | Log search | 1I | Done |
| [FEAT-008](items/FEAT-008-conflicts.md) | Conflicts | 1D | Done |
| [FEAT-009](items/FEAT-009-rebase.md) | Interactive rebase | 1E | Done |
| [FEAT-010](items/FEAT-010-pull-requests.md) | Pull requests | 1H | Done |
| [FEAT-011](items/FEAT-011-settings.md) | Settings | 1K | Done |
| [FEAT-012](items/FEAT-012-clone.md) | Clone | 1L | Done |
| [FEAT-013](items/FEAT-013-branch-destructive-operations.md) | Branch delete and rename | 1F | Partial |
| [FEAT-014](items/FEAT-014-stash-pop-apply-drop.md) | Stash pop, apply and drop | 1G | Done |
| [FEAT-015](items/FEAT-015-rebase-execution.md) | Rebase execution | 1E | Partial |
| [FEAT-016](items/FEAT-016-conflict-resolution-writes.md) | Conflict resolution writes | 1D | Backlog |
| [FEAT-017](items/FEAT-017-forge-integration.md) | Forge integration | 1H, 1K | Backlog |
| [FEAT-018](items/FEAT-018-fetch-and-push.md) | Fetch and push | chrome | Partial |
| [FEAT-019](items/FEAT-019-commit-signing.md) | Commit signing | 1C, 1K | Backlog |
| [FEAT-020](items/FEAT-020-show-git-commands.md) | Show the git command behind each action | all, 1K | Done |
| [FEAT-021](items/FEAT-021-themes.md) | Themes, and a title bar that stops lying | chrome, 1K | Done |
| [FEAT-022](items/FEAT-022-graph-parity.md) | The graph as a launcher, not a report | 1A | Done |
| [FEAT-023](items/FEAT-023-graph-presentation.md) | Author heads, and a graph column of its own | 1A | Done |
| [FEAT-025](items/FEAT-025-resizable-message-column.md) | A table you can size, and one that scrolls sideways | 1A | Done |
| [FEAT-026](items/FEAT-026-collapsible-rail.md) | The nav rail collapses to icons | chrome | Done |
| [FEAT-027](items/FEAT-027-repository-tabs.md) | Repository tabs in the title bar | chrome | Done |
| [FEAT-028](items/FEAT-028-toolbar-groups.md) | The toolbar: centred, grouped, and without Commit | chrome | Done |
| [FEAT-029](items/FEAT-029-graph-and-type-presentation.md) | Bigger faces, and a type scale the rail follows | 1A, chrome | Done |
| [FEAT-030](items/FEAT-030-rail-open-repository.md) | The rail's open-repository slot | chrome | Done |
| [FEAT-033](items/FEAT-033-branch-divergence-on-the-chip.md) | Branch divergence on the chip | 1A | Backlog |
| [FEAT-034](items/FEAT-034-stash-entry-file-browsing.md) | Browse a stash entry file by file | 1G | Backlog |
| [FEAT-035](items/FEAT-035-lane-overflow-compression.md) | Lanes past the cap compress instead of stacking | 1A | Done |
| [FEAT-036](items/FEAT-036-one-chip-per-branch.md) | One chip per branch, local and remote as icons | 1A | Done |
| [FEAT-037](items/FEAT-037-window-depth-and-resizable-panels.md) | The window has depth, and every panel resizes | chrome | Done |
| [FEAT-038](items/FEAT-038-pull.md) | Pull | chrome | Done |
| [FEAT-039](items/FEAT-039-resizable-graph-column.md) | The graph column resizes, and the lanes compress into it | 1A | Done |
| [FEAT-040](items/FEAT-040-graph-footer.md) | The graph's footer says what is true, not what to do | 1A | Done |
| [FEAT-041](items/FEAT-041-rail-drops-the-shortcut-hint.md) | The rail stops advertising a shortcut | chrome | Done |
| [FEAT-042](items/FEAT-042-tighter-corners-and-a-round-cast.md) | Tighter corners, and a cast shadow that follows them | all | Done |
| [FEAT-043](items/FEAT-043-app-status-strip.md) | A status strip along the bottom of the window | chrome | Done |
| [FEAT-044](items/FEAT-044-repo-tabs-own-row.md) | The repository tabs get a row of their own | chrome | Done |
| [FEAT-045](items/FEAT-045-toolbar-repo-and-branch.md) | The toolbar names the repository, and picks a branch for real | chrome | Done |
| [FEAT-046](items/FEAT-046-graph-squeeze-keeps-the-portraits.md) | Squeezing the graph column must not shrink the portraits | 1A | Done |
| [FEAT-047](items/FEAT-047-branch-table-columns-and-divergence.md) | The branches table: resizable columns, and a divergence worth reading | 1F | Done |
| [FEAT-048](items/FEAT-048-discard-changes.md) | Discard changes | 1C | Done |

## Bugs

| ID | Title | Screen | Status |
| --- | --- | --- | --- |
| [BUG-001](items/BUG-001-type-errors-shipped-in-task-002.md) | Type errors shipped in TASK-002 | — | Fixed |
| [BUG-002](items/BUG-002-primary-button-invisible.md) | The primary button has no fill | all | Fixed |
| [BUG-003](items/BUG-003-lane-canvas-offset.md) | The lane canvas paints over the messages | 1A | Fixed |
| [BUG-004](items/BUG-004-linux-blank-webview.md) | The packaged Linux app opens a blank window | packaging | Fixed |
| [BUG-005](items/BUG-005-metrics-doc-and-test-drift.md) | The geometry change left its test and comments behind | 1A | Fixed |
| [BUG-006](items/BUG-006-repo-card-branch-overlap.md) | A long branch name overlaps the branch count | 1J | Fixed |
| [BUG-007](items/BUG-007-replaced-dialog-resolves-wrong-value.md) | A replaced dialog resolves the wrong caller's value | all | Fixed |
| [BUG-008](items/BUG-008-menu-arrow-up-from-nothing.md) | ArrowUp into a fresh menu lands in the middle | all | Fixed |
| [BUG-009](items/BUG-009-message-column-has-no-handle.md) | The commit message column cannot be resized | 1A | Fixed |
| [BUG-009b](items/BUG-009b-graph-divider-resizes-message.md) | The boundary people reach for carries a dead divider | 1A | Fixed |

`BUG-009b` carries a suffix rather than the next number because it is the same
report, reopened on a corrected diagnosis, and BUG-009's own document keeps the
first diagnosis visible. Identifiers are not reused, so the correction needed one
of its own.

## Tasks

| ID | Title | Screen | Status |
| --- | --- | --- | --- |
| [TASK-001](items/TASK-001-records-baseline.md) | Records baseline | — | Done |
| [TASK-002](items/TASK-002-test-and-ci-baseline.md) | Test and CI baseline | — | Done |
| [TASK-003](items/TASK-003-runtime-generic-tauri-layer.md) | Make the Tauri layer generic over `Runtime` | — | Backlog |
| [TASK-004](items/TASK-004-rename-to-spagitty.md) | Rename the project from GitLord to Spagitty | — | Done |
| [TASK-005](items/TASK-005-branch-coverage-floor.md) | Branch coverage is below the Amendment 10 floor | — | Done |
| [TASK-007](items/TASK-007-copy-sweep.md) | Copy sweep: drop the hand-holding and the Mac notation | all | Done |
| [TASK-008](items/TASK-008-branches-footer.md) | The last self-narrating footer | 1F | Done |
| [TASK-009](items/TASK-009-drop-the-work-item-ids.md) | The interface stops naming its own work items | all | Done |
| [TASK-010](items/TASK-010-security-gate-advisories.md) | Gate 4 fails on unmaintained advisories | — | Done |
| [TASK-011](items/TASK-011-secret-scanning-never-ran.md) | Secret scanning has never run | — | Done |
| [TASK-012](items/TASK-012-record-drift.md) | The working record has drifted from the tree | — | Done |
| [TASK-013](items/TASK-013-backfill-document-sets.md) | Backfill the missing plan and testing documents | — | Done |

## Skipped identifiers

These were assigned and never became items. They are listed so a reader can tell
a *missing* document from an identifier that was never real, and because
Amendment 12 forbids reusing any of them.

| ID | What is known |
| --- | --- |
| FEAT-024 | Cited nowhere. Skipped when the numbers were handed out. |
| FEAT-031 | Cited once, by FEAT-035, as "changes `CommitRows`". Nothing else survives; the intent is not recoverable. Retired. |
| FEAT-032 | Cited nowhere. Skipped. |
| TASK-006 | Cited nowhere. Skipped. |

## Documents outstanding

Items that are built but do not yet have all four documents. Each row is a debt,
recorded rather than hidden; `tools/record.test.ts` fails if a built item's
missing documents are not listed here, and fails again if a row here is stale.

| ID | Missing | Why, and what closes it |
| --- | --- | --- |
| BUG-001 | plan, automated, sweep | Fixed inside FEAT-003's change before it had a branch of its own; its item document says so. No separate work to plan. |
| FEAT-013 | plan, automated, sweep | `Partial`. The plan is written when the remaining Branches-screen work starts. |
| FEAT-015 | plan, automated, sweep | `Partial`. Same — written when the frontend work starts. |
