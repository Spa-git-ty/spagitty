<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-019 — The launch sequence lives where no test can reach it

**Status:** Done on `task/TASK-019-resume-session`.
**Surface:** `src/lib/session.ts`, `src/routes/+layout.svelte`.
**Recorded by:** BUG-013, the bug that restored a tab strip without opening
what it named. Its testing document declared this refactor out of its own scope
and its own item.

## Problem

What a launch opens was a run of calls inside `onMount` in
`src/routes/+layout.svelte`: read the path from the command line, open it, or
else reopen the tab the last session was on and land on its route and its
selected commit.

The bug that came out of it was a single missing call. The tab strip was
restored from storage, so the window came back with a repository's name across
the top, and nothing had told the backend to open it — a label on an empty
session, with the All repositories screen as the only way out.

Nothing about that sequence was hard. It was unreachable:

- `src/routes/**` is excluded from the coverage scope on purpose, because those
  files are the screens' shells and their logic is supposed to live in
  `src/lib`.
- The exclusion is right. What it exposed is that this particular piece of logic
  was in the wrong file.
- Every part the sequence calls is already covered where it lives —
  `workspace.active` and `workspace.placeOf` in `src/lib/workspace.test.ts`,
  `graph.want` in `src/lib/graph/store.test.ts`, `repo.open` and the error a
  path that does not resolve leaves behind in `src/lib/repo.test.ts`. What was
  untested is the **order they are called in**, which is the entire bug.

## Scope

- `src/lib/session.ts`: a `resumeSession(port)` that performs the sequence
  against a port of eight operations.
- `src/routes/+layout.svelte` supplies the real port and calls it. Behaviour is
  identical — this is a move, not a change.
- `src/lib/session.test.ts` asserts the order, with a port that records what it
  was asked to do.

## Non-scope

- Changing what a launch does. Every branch, every guard and every ordering in
  the new module is the one that was in the shell, including the three
  cancellation checks and the fact that the place is read before the open.
- The rest of `onMount`. The listeners, the settings read and the row-pitch
  guard stay in the shell; they are wiring, not a decision, and moving them
  would be a refactor for its own sake.

## Acceptance criteria

1. Opening the application with a path on the command line opens that path and
   navigates nowhere.
2. Opening it with no path reopens the last session's active tab, on the route
   and the commit it was left on.
3. A tab whose repository has moved or been deleted stops the sequence and
   leaves the tab in place.
4. A shell torn down mid-launch performs nothing after the teardown.
5. All five are asserted by tests in `src/lib`, and the coverage scope contains
   them.

## Dependencies

BUG-013, which this is recorded against. It is fixed and shipped; this item
does not change its behaviour, only where the behaviour is written.
