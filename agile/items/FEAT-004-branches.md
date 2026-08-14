<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-004 — Branches (1F)

**Status:** Planned.
**Branch:** `feature/FEAT-004-branches`.
**Route:** `/branches`. **Rail:** "Branches", count `branches`.

## Problem

The toolbar's branch picker and its Branch button both land on a placeholder.
The rail reports a branch count but there is nowhere to see what those branches
are, how far each has drifted from its upstream, or which are safe to forget.

## Motivation

"How far behind am I, and which of these forty branches still matter" is a
question people answer today by reading `git branch -vv` and squinting. It is
mostly a table, and a table is exactly what a GUI is good at.

## Scope

- Every local branch, and remote-tracking branches, with: upstream, ahead and
  behind counts, last change time, and whether it is merged into HEAD.
- Filter field and chips: mine, origin, upstream, merged, stale.
- Checking out a branch.
- Creating a branch from a chosen starting point.
- Merged branches rendered dashed, so what is safe to remove is visible even
  though removing it is not built yet.

## Non-scope

- Deleting or renaming branches — FEAT-013.
- Fetching, so ahead/behind is against whatever the last fetch left behind;
  the screen says when that was rather than pretending to be live. Fetch is
  FEAT-018.
- Setting or changing an upstream.
- Merging or rebasing from this screen.

## Acceptance criteria

1. The listed branches and their ahead/behind counts match
   `git branch -vv` and `git rev-list --left-right --count` for the same
   repository.
2. The current branch is marked, sorted first, and cannot be checked out again.
3. The merged flag matches `git branch --merged`.
4. Checking out a branch updates the title bar, the toolbar picker, the graph
   and the rail counts, and runs through the `git` binary so filters and hooks
   apply.
5. Checkout is refused, with git's own message, when the working copy would be
   overwritten — nothing is silently discarded.
6. Creating a branch from a chosen commit produces exactly the ref
   `git branch <name> <start>` would, and refuses an invalid or duplicate name
   with a reason.
7. Filter chips compose, and the empty result says so rather than showing a
   blank table.
8. A repository with one branch and no remote renders without empty columns
   pretending to hold data.

## Dependencies

FEAT-001 (`RefIndex`), TASK-002 (fixture helper).
