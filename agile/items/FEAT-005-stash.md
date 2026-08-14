<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-005 — Stash (1G)

**Status:** Planned.
**Branch:** `feature/FEAT-005-stash`.
**Route:** `/stash`. **Rail:** "Stash", count `stashes`.

## Problem

The rail already counts stash entries — `status::stash_count` reads the reflog
of `refs/stash` — but there is nowhere to see what is in them. A stash whose
contents you cannot inspect is a box you are afraid to open.

## Motivation

Stashes accumulate and then rot, because nobody remembers what `stash@{4}` was.
Showing each entry hanging off the commit it was made on, with its diff, turns
the list back into something readable.

## Scope

- Every stash entry, with its `stash@{n}` ref chip, message, time, and the
  commit it was made on.
- A lane column so each entry visibly hangs off its parent commit, reusing the
  Graph screen's lane rendering rather than a second one.
- The entry's diff in the detail panel, reusing `diff::commit_diff`.
- Stashing the current working copy, with a message, including untracked files
  as an option.

## Non-scope

- Pop, apply and drop — FEAT-014. Their buttons render, disabled, saying why,
  because a stash screen that hides them would be lying about what a stash is
  for.
- Stashing a subset of files or hunks.
- Branching from a stash.

## Acceptance criteria

1. The entries and their order match `git stash list` exactly, `stash@{0}`
   first.
2. Each entry's diff matches `git stash show -p stash@{n}`.
3. The entry is drawn hanging off its parent commit, at the parent's row, with
   the lane geometry the graph uses.
4. Stashing writes exactly what `git stash push` writes: the working copy is
   clean afterwards, the new entry is `stash@{0}`, and the rail count rises.
5. Stashing with untracked files included is a distinct, labelled choice.
6. Stashing with nothing to stash is refused with git's own message rather than
   creating an empty entry.
7. A repository with no stash shows an empty state that says what a stash is
   for, not a blank pane.
8. Pop, Apply and Drop are visibly disabled and say they are not built yet.

## Dependencies

FEAT-001 (lane rendering), FEAT-002 (`commit_diff`), TASK-002 (fixture helper).
