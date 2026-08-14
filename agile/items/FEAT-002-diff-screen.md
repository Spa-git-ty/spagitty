<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-002 — Diff screen (1B)

**Status:** Done — commit `a8cad94` on `feature/FEAT-002-diff-screen`.
**Record written:** retroactively, under TASK-001. The code was written before
this document; the reasoning is taken from the implementation and its comments.

## Problem

The Graph screen answers "what happened". It cannot answer "what changed" —
the detail panel lists the files a commit touched but shows no content. Opening
a commit's actual diff meant leaving GitLord for the terminal.

## Motivation

Reading a diff is the second thing anyone does after finding a commit, and it
is the operation most sensitive to layout: a diff that reflows, mis-numbers
lines, or silently shows nothing for a binary file costs trust immediately.

## Scope

- A full-window screen at `/diff?commit=<id>`, opened by double-clicking a
  commit row or from the detail panel's file list.
- The file list for one commit, with per-file `+n −m` and totals in the header.
- The hunks of the selected file, in unified or side-by-side view, with the
  choice remembered.
- Keyboard: `j` / `k` between hunks, `Esc` back to the graph.
- Honest states for binary files, over-large files, mode-only changes, an empty
  commit, a missing commit and a missing path.

## Non-scope

- Diffing anything that is not one commit against its first parent: the working
  copy, the index, two arbitrary commits, and a merge's second parent are all
  other screens' work.
- Any write: no staging, no reverting a hunk, no editing.
- Word-level intra-line highlighting.

## Acceptance criteria

1. Opening a commit shows its file list and header totals in one round trip.
2. Selecting a file fetches only that file's hunks; re-selecting a file already
   viewed does not fetch again.
3. Line numbers on both sides match what `git show` prints for the same commit.
4. Hunk headers match git's `@@ -a,b +c,d @@` convention, including the
   zero-start form for an empty range.
5. A binary file says so and shows no `+0 −0`.
6. A file too large to diff says so rather than appearing unchanged.
7. Switching between unified and split does not refetch anything, and the two
   views agree line for line.
8. In split view the two columns stay level: a wrapped line takes its opposite
   number down with it.
9. `Esc` returns to the graph; the screen can also be the first one painted
   (window opened straight onto a commit) without racing the repository open.
10. A slow response for a file the user has already navigated away from never
    overwrites what is on screen.

## Dependencies

FEAT-001 (the graph is where the screen is opened from, and `diff::commit_detail`
already existed for the detail panel).
