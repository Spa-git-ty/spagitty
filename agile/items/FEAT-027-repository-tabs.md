<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-027 — Repository tabs in the title bar

**Status:** Built. Plan in `agile/plans/FEAT-027-plan.md`, tests in
`agile/testing/FEAT-027-automated.md` and `agile/testing/FEAT-027-sweep.md`.
**Screen:** the chrome, on every screen.

## Problem

The title bar said the repository's name and its branch — both of which the
toolbar's pickers say one row below — and offered no way to move between
repositories. Every switch went through the All repositories screen, and
arrived at the graph's top with the previous screen and selection lost.

## Decisions the author made

- **A tab switches; the backend keeps one repository.** GitLord's Rust side
  holds one `AppState.session`, one graph worker, one watcher. Asked whether to
  build truly simultaneous sessions — a worker, a watcher and a walk per tab, with
  events routed per repository — the author chose not to buy a subsystem for a
  tab strip. The honest consequence is recorded below.
- **`+` opens a menu**: Open repository…, Clone…, and the recent list.
- **Closing a tab leaves the strip only.** The repository stays in GitLord's
  list and in the `+` menu.

## What was built

- `src/lib/workspace.svelte.ts` — the open tabs, the active one, and where each
  repository was last left: its route and its selected commit. Nothing else,
  because column widths and panel sizes are already stored per repository and
  duplicating them would give two answers to one question.
- `src/lib/chrome/RepoTabs.svelte` — the strip and its menu. Switching writes
  the outgoing repository's place, opens the incoming one, restores its route,
  and hands the selected id to the graph store.
- `graph.want(id)` on the graph store: a selection restored by *id*, since a row
  index means nothing after a fresh walk. It reuses `selectionUnverified`, the
  machinery a ref-move already relied on, and gives up honestly if the walk
  completes without finding it.
- `repo.open` records every open as a tab, so the strip fills the same way from
  the All repositories screen, the launch argument and a finished clone.
- The title bar: **GitLord** in bold, an **All repositories** button, the tabs,
  the `+`, then the licence and version and the window controls. The repository
  name and branch chip are gone from it — they are on the toolbar and on the
  active tab.

## The cost, stated

A switch re-opens the repository: `open_repo`, a fresh walk, a new watcher. On a
large history the graph fills progressively rather than instantly. The tab shows
its repository as loading while that happens rather than an empty graph
pretending to be ready.

## Acceptance criteria

1. Every repository opened this session appears as a tab; the active one is
   marked. ✔
2. Clicking a tab opens that repository and returns to the screen and the commit
   it was left on. ✔
3. `+` offers Open, Clone and the recent repositories not already open. ✔
4. `✕` closes the tab and leaves the repository in the list; the neighbour
   becomes active. ✔
5. The strip and the remembered places survive a restart. ✔
6. The title is the program's name, in bold. ✔

## Non-scope

- Simultaneous live sessions per tab (above).
- Dragging tabs to reorder, and overflow behaviour past twelve tabs — the cap
  drops the oldest inactive tab for now.

## Dependencies

FEAT-006 (the repository list), FEAT-022 (the graph selection machinery).
