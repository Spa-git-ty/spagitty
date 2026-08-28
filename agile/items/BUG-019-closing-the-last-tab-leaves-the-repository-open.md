<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-019 — Closing the last tab leaves the repository open

**Status:** Fixed, awaiting sweep
**Branch:** `bugfix/BUG-019-closing-the-last-tab-leaves-the-repository-open`
**Screens:** the chrome, and every screen showing repository data.

## Problem

Closing the last open tab takes the tab strip away and leaves the repository
open behind it. The toolbar still names it and offers its branch menu, the nav
rail still counts its branches and its commits, and the Graph screen is still
full of its history — with no tab anywhere to close a second time.

The strip disappearing is correct (FEAT-044: a band of chrome with nothing in it
makes an empty application look broken). Everything else disappearing with it is
what did not happen.

**Two things were missing, and they compound.**

`workspace.close(path)` returns the tab that should be shown next, and `null`
when there is none. `RepoTabs.closeTab` read that as:

```ts
const next = workspace.close(path);
if (wasActive && next) void switchTo(next);
```

There is no other branch. "There is nothing left to show" was handled by doing
nothing at all, so nothing ever told the repository to close. `repo.close()`
existed, complete and correct, and **no code in the application called it**.

Second, `repo.close()` cleared `info`, `token` and `counts` but did not move
`generation`. That counter is the signal every screen keys off to notice the
repository underneath it has changed — the shell restarts the walk on it, and
the screens that cache per repository re-sync on it. Wiring the call without
the bump would have emptied the store and left the graph still full.

## Reproduction

1. Open one repository, so there is a single tab.
2. Close that tab with its × control.

**Observed:** the tab strip goes. The toolbar still shows `fixture › main`, the
rail still counts commits and branches, and the graph still lists the commits.
**Expected:** nothing open — no location in the toolbar, no counts, no history.

**Environment:** any. It is a wiring fault in the front end and has nothing to
do with the platform.

## Scope

- Closing the last tab closes the repository.
- `repo.close()` moves the generation, as `open()` does, so everything keyed to
  it clears.
- Closing one of several tabs still switches rather than closing — that path is
  unchanged.

## Non-scope

- Removing the repository from Spagitty's list. Closing a tab is not forgetting
  a repository; it stays in the list and in the `+` menu, and the place it was
  left at is still remembered.

## Acceptance criteria

- With one tab open, closing it leaves the application with nothing open.
- With several open, closing one switches to a neighbour and closes nothing.
- Closing a tab that is not the active one changes what is shown not at all.
- A test fails without the fix.

## Dependencies

None. The empty state a closed repository lands in is the subject of a separate
feature currently in progress; this item is only about actually reaching it.
