<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-003 — Working copy / Commit (1C)

**Status:** Done.
**Branch:** `feature/FEAT-003-working-copy`.
**Route:** `/changes`. **Rail:** "Working copy", count `working`.

## Problem

GitLumiere can read history and cannot add to it. The toolbar's primary button says
"Commit" and lands on a placeholder; the rail's Working copy count is a `·`
because nothing computes it. Making a commit means leaving for the terminal,
which is the single most common thing anyone does in a git client.

## Motivation

This is the screen the whole application is arranged around — the toolbar's
primary action points at it, and two rail counts depend on the status walk it
needs. Until it exists, GitLumiere is a history viewer.

## Scope

- A real status walk: staged, unstaged, untracked and conflicted entries, with
  the same classification `git status` would give.
- Real `working` and `conflicts` counts in the rail, replacing the two `None`s
  in `status::counts`.
- Staging and unstaging a whole file, and staging and unstaging a single hunk.
- A message box with a subject line and a body, and the commit itself.
- The hunk pane, reusing the Diff screen's hunk rendering rather than a second
  implementation.
- Amending the previous commit is **in** scope only as far as pre-filling the
  message; see non-scope.

## Non-scope

- Discarding changes, reverting a hunk, or cleaning untracked files. All are
  destructive and belong to their own item.
- Rewriting a pushed commit. Amend that changes history beyond the tip is
  FEAT-015's territory.
- Partial-line staging.
- Signing configuration — the commit goes through the `git` binary, so signing
  works if the user has configured it, but GitLumiere does not configure it here.

## Acceptance criteria

1. The staged and unstaged lists match `git status --porcelain` for the same
   working copy, including renames, deletions and untracked files.
2. The rail's Working copy count matches the number of entries the screen shows,
   and stops being `·`.
3. Staging a file moves it from unstaged to staged and is visible to
   `git status` in a terminal immediately.
4. Unstaging is the exact inverse: stage then unstage leaves the index as it
   was, byte for byte.
5. Staging one hunk of a multi-hunk file stages only that hunk; the rest stays
   unstaged and the file appears in both lists.
6. Committing with an empty subject is refused, with a reason.
7. The commit runs the repository's hooks. A `pre-commit` hook that exits
   non-zero stops the commit and its output is shown.
8. After committing, the graph shows the new commit and the screen resets.
9. Nothing is written to the repository until the commit button is pressed.
10. A file that is binary, too large, or has only a mode change says so rather
    than showing an empty hunk pane.

## Dependencies

FEAT-002 (hunk rendering and the `DiffLine` shape), TASK-002 (fixture helper for
the status tests).
