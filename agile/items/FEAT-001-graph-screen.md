<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-001 — Graph screen (1A)

**Status:** Done — commit `4e8ea60`.
**Branch:** none. The work predates Amendment 13 being applied here and landed
directly on `main` as the repository's first commit.
**Record written:** retroactively, under TASK-001. What follows describes what
was built and why, reconstructed from the code and its comments; it is not a
contemporaneous record and does not pretend to be one.

## Problem

GitLumiere's premise is that the commit graph is the centre of gravity and every
other screen is one focused task. Nothing else can be built or judged until the
graph exists: it is what the nav rail counts against, what the Diff screen is
opened from, and what the application chrome is shaped around.

## Motivation

A graph that stutters or reflows while history loads is the single most visible
failure a git client can have. Rendering had to stream, stay at a fixed row
pitch, and never re-layout rows that are already on screen.

## Scope

- Application chrome: undecorated window, title bar, toolbar, nav rail,
  resizable panels, light and dark themes.
- The commit graph: streamed walk, lane assignment, lane colours, elbow edges,
  refs gutter, virtualised rows.
- The commit detail panel beside it.
- Opening a repository, and re-reading it when the filesystem watcher fires.

## Non-scope

- Every other screen. They exist as routes with `ScreenStub` bodies.
- Any write to the repository.
- Counts for screens that do not exist — they report `null` and the rail draws
  a `·` rather than inventing a number.

## Acceptance criteria

1. Opening a repository paints rows as they arrive rather than after the walk
   finishes, and the first screenful appears without waiting for the rest.
2. A row's vertical position is `index * ROW_PITCH` and never changes once
   drawn.
3. Lane colour is stable for a lane's whole lifetime; a branch that runs for a
   thousand commits does not change colour partway.
4. A merge draws an elbow spanning exactly one row, in the incoming lane's
   colour.
5. Refs render as chips in the gutter, current branch first.
6. A walk superseded by a newer one is dropped by token, not by racing.
7. The rail's commit count comes from the walk itself, not an estimate.

## Dependencies

None. This is the first item.
