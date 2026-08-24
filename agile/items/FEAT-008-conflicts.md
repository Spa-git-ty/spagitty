<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-008 — Conflicts (1D)

**Status:** Done.
**Branch:** `feature/FEAT-008-conflicts`.
**Route:** `/conflicts`. **Rail:** "Conflicts", count `conflicts`.

## Problem

A repository mid-merge is the moment a git client is most needed and Spagitty
currently says the least: the Conflicts count is a `·` and the screen is a
placeholder. The user is left reading conflict markers in an editor with no view
of what the two sides actually were.

## Motivation

Conflict resolution is where people lose work. Seeing ours, theirs and the
merged result at once — with the base available — is most of the value, and it
can be delivered without writing anything.

## Scope

- Reading conflicted paths from the index: stage 1 (base), stage 2 (ours),
  stage 3 (theirs).
- A three-pane view: ours, the merged result with its conflict markers, theirs.
- A conflict pager for moving between conflicted files.
- The real `conflicts` count in the rail.
- Saying plainly which operation is in progress — merge, rebase, cherry-pick —
  and what the reflog keeps.

## Non-scope

- Writing a resolution: taking ours, taking theirs, editing the merged pane, or
  marking a file resolved. All of it is FEAT-016; the buttons render disabled.
- Aborting the merge — also FEAT-016, because it discards work.
- Three-way merge algorithms of our own. What the index holds is what git put
  there.
- Binary conflict resolution.

## Acceptance criteria

1. The conflicted paths match `git diff --name-only --diff-filter=U`.
2. The rail's Conflicts count matches that number and stops being `·`.
3. Ours, base and theirs each match `git show :2:<path>`, `:1:<path>` and
   `:3:<path>` byte for byte.
4. A file added on both sides — no stage 1 — renders with an empty base and
   says so rather than failing.
5. A delete/modify conflict renders with the missing side labelled as deleted,
   not as an empty file.
6. The screen names the operation in progress by reading the repository state,
   not by guessing from the presence of conflicts.
7. A repository with no conflicts shows a calm empty state.
8. Nothing on this screen writes to the repository. Verified by the working copy
   and index being unchanged after visiting every conflicted file.

## Dependencies

FEAT-003 (the status walk that classifies a conflicted entry), TASK-002 (a
fixture repository with a real conflict).
