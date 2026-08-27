<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-027 — Plan

## Architecture decision: a tab is a bookmark, not a session

The backend holds one repository. Two ways to give the user tabs:

| | Cost | Result |
| --- | --- | --- |
| **Session per tab** | A session map in Rust, per-repository event routing, a worker and a watcher each, memory that scales with tabs, and a new class of bug when two tabs touch one worktree | Instant switching, background fetches |
| **Tab as a place** (chosen) | One store in the frontend | A switch re-opens and restores; the walk starts again |

The author chose the second, and the honesty requirement that comes with it is
part of the item: the tab shows its repository loading rather than presenting an
empty graph as a ready one.

## What is remembered, and what is deliberately not

Route and selected commit. **Not** column widths or panel sizes — those already
persist per repository in `columns.svelte.ts` and `panels.svelte.ts`, and a
second copy here would be a second answer to one question.

The selection is restored by **id**, through a new `graph.want(id)`. A row index
is meaningless after a fresh walk; an id is not, and the store already has
`selectionUnverified` for a selection that must survive a walk whose end it
cannot see.

## Where the tab is recorded

In `repo.open`, not in the tab strip. Every route into a repository — the strip,
the All repositories screen, the launch argument, a finished clone — goes
through that one function, so that is the only place that can see all of them.

## Files

| File | Change |
| --- | --- |
| `src/lib/workspace.svelte.ts` | New: tabs, active, places, persistence. |
| `src/lib/chrome/RepoTabs.svelte` | New: the strip, switching, the `+` menu. |
| `src/lib/chrome/TitleBar.svelte` | Bold title, All repositories, the strip. |
| `src/lib/repo.svelte.ts` | Records the open. |
| `src/lib/graph/store.svelte.ts` | `selectedId`, `want`. |
| `src/routes/+layout.svelte` | `workspace.init()` before anything opens. |

## Risks

- **A tab pointing at a repository that has moved.** `repo.open` fails and
  reports; the tab stays so it can be closed. The `+` menu already marks missing
  repositories from the recent list.
- **Storage growing.** Tabs are capped at twelve; places are small and keyed by
  path.
- **The drag region.** The title bar drags the window, so the strip sets
  `-webkit-app-region: no-drag` or a click on a tab would move the window.

## Rollback

Revert. The title bar returns to name-and-branch; nothing else depends on the
workspace store.
