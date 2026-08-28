<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-044 — Plan

**Item:** [`agile/items/FEAT-044-repo-tabs-own-row.md`](../items/FEAT-044-repo-tabs-own-row.md)
**Branch:** `feature/FEAT-044-tabs-row`
**Status:** implemented.

## Approach

The tabs stop being a passenger in the title bar and become a row.

```
before                          after
  TitleBar  name | All | tabs | controls      TitleBar  name | controls
  Toolbar                                     RepoTabs  tabs | +
  main                                        Toolbar
                                              main
                                              StatusStrip
```

`RepoTabs` already draws the strip of tabs; what it gains is the row around it,
declared in the component rather than in the layout, so the component owns its
own chrome the way `TitleBar` and `Toolbar` own theirs. The layout renders it
between the two.

### The row hides when there is nothing in it

`{#if tabs.length > 0}`. A row of chrome across the window with nothing in it is
worse than no row: it makes an empty application look broken. With no repository
open the title bar sits directly on the toolbar, exactly as it did before this
item.

The `+` button lives in the row and goes with it. It is not the only way to open
a repository — the rail's top slot is Open repository (FEAT-030), and All
repositories is a rail item — so nothing becomes unreachable.

### `All repositories` leaves the strip

It was a button beside the tabs, which made it read as a tab that is always
open. It is not a tab; it is the way back, and the rail already carries it as
screen 1J. Removing it from the row is the item's second half, and it is what
makes the row mean one thing: the repositories you have open.

### Alignment

The row's tabs align to its bottom edge, because a tab's shape — rounded at the
top, square at the bottom, with the active one carrying an accent underline —
is drawn to sit **on** a boundary. In the title bar that boundary was the bar's
own bottom border; here it is the row's.

## Files

`src/lib/chrome/RepoTabs.svelte` — the row wrapper, its style, and the empty
case.
`src/lib/chrome/TitleBar.svelte` — `RepoTabs`, the `All repositories` button and
its styles removed.
`src/routes/+layout.svelte` — one element between `TitleBar` and `Toolbar`.
`src/lib/metrics.ts` — `TABS_H`, published as `--tabs-h`, so the row scales with
the rest of the chrome.
`src/lib/chrome/chrome.test.ts` — the tab assertions move to `RepoTabs`; the
title bar gets the inverse ones.

## Testing

The tab tests render `RepoTabs` directly now rather than reaching through
`TitleBar`, which is what they were always about. Two new assertions carry the
item: the title bar no longer offers `All repositories`, and the row is absent
entirely when nothing is open.

## Risk

Low. No behaviour changes — switching, closing, the busy mark and the `+` menu
are untouched.

The visible risk is vertical space: the window now has four chrome rows at the
top when repositories are open (title bar, tabs, toolbar) plus the status strip
at the bottom. The tab row is the shortest of them and disappears when empty,
which is the mitigation; whether it still feels like too much is a judgement,
and the sweep asks for it explicitly.

## Rollback

Revert the branch.
