<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-013 — Branch delete and rename

**Status:** Done on `feature/FEAT-013-branch-delete-rename`. `ops::delete_branch`
and `ops::rename_branch` were built with FEAT-004 and reachable from the graph;
the Branches screen's own delete and rename, the bulk merged-branch cleanup, and
the recovery instruction the notes below asked for were built here.
**Screen:** Branches (1F).

## Problem

FEAT-004 shows which branches are merged and safe to remove, and renders them
dashed, but cannot remove them. Deleting an unmerged branch can lose commits
that nothing else points at.

## Why it was deferred

The author's decision at the start of the screen work: safe writes land first,
destructive operations get their own item so the confirmation and recovery story
is designed rather than bolted on.

## Scope when started

- Deleting a merged branch.
- Deleting an unmerged branch, behind an explicit confirmation that names what
  would become unreachable and how to get it back from the reflog.
- Renaming a branch, including moving its upstream configuration.
- The footer action FEAT-004 describes: removing all merged branches at once,
  with the full list shown before it runs.

## Notes for whoever picks this up

- Deleting a branch is `git branch -d`; the unmerged case is `-D` and must never
  be reached without the user having seen what it costs.
- The reflog is the recovery path and the confirmation should say so, with the
  actual command to run.
- Deleting the current branch is refused by git; the screen should refuse it
  earlier, with a better sentence.

## Dependencies

FEAT-004.
