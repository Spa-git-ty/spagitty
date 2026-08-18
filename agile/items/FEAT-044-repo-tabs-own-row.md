<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-044 — The repository tabs get a row of their own

**Status:** Backlog. No plan yet; one is written when the work starts.
**Screen:** the chrome, so every screen.
**Requested by:** the author, 2026-08-18.

## Problem

`TitleBar.svelte` renders `RepoTabs` inline, so the tabs share one row with the
program name, the way back to All repositories, and the window controls. Two
consequences:

- The tabs are squeezed by everything else in the row, and the row is the one
  that has to survive a window being narrowed.
- The tabs are a *workspace* control — which repositories are open — sitting in
  a row otherwise made of window controls.

`All repositories` also lives in that strip as a button beside the tabs, where it
reads as a tab that is always present rather than as the way back.

## Wanted

- The tab strip becomes **its own row, below the title bar**, above the toolbar.
- `All repositories` is **removed from it**. It stays reachable — it is a rail
  item — but it is not a tab.

## Non-scope

- What a tab does. Opening, closing, switching and the active mark are all built
  and unchanged.
- The toolbar, which keeps its own row.

## Acceptance criteria

- The tabs occupy a row of their own, with the title bar above and the toolbar
  below.
- `All repositories` is not in that row.
- Reaching every repository is still one click from the shell.
- With no repository open the row does not leave an empty band across the window.
- The title bar's remaining contents keep their positions.

## Dependencies

FEAT-027, which built the tabs. FEAT-043, which added the strip at the other end
of the window and is where the title bar's spare content went.
