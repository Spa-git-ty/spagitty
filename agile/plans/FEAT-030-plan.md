<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-030 — Plan

**Item:** [`agile/items/FEAT-030-rail-open-repository.md`](../items/FEAT-030-rail-open-repository.md)
**Branch:** `feature/FEAT-030-rail-open-repository`
**Status:** implemented.

## Approach

Three changes, and they are one change: the rail's most valuable slot was spent
on a duplicate while the action a new user needs first was hidden at the bottom.
Removing the filter field is what makes the slot available; moving Open
repository… into it is the point.

### The filter field

Deleted outright rather than rewritten. It reached `/search` — the same place the
Log rail entry reaches and the same place `Ctrl+F` reaches from anywhere. Three
routes to one screen, one of them occupying the top of the rail. TASK-007 left
its `⌘F` glyph alone precisely because this item deletes the field around it.

### Open repository…

Takes the slot, `primary` rather than plain, and stretched to the rail's width —
it is the primary action of a window with no repository open, and at its own
size in a full-width slot it reads as one option among several.

Collapsed, the `⊞` glyph moves with it, so the two states offer the same control
in the same place.

### The foot

Keeps "Tags N · Submodules N", alone — and is now **hidden entirely while
collapsed**. It previously held the collapsed `⊞` button; with that gone, a
collapsed foot would render a counts line in a rail too narrow for its labels.
That was not in the intake and is the kind of thing only found by doing the work,
so it is recorded here rather than passed off as part of the request.

### The order

`NAV_ITEMS` puts Log after Rebase. The list is the screens roughly as they are
worked through; Log is where you go to look something up, not a step in that
sequence.

## Files

| File | Change |
| --- | --- |
| `src/lib/chrome/NavRail.svelte` | filter field removed with its `.filter` / `.field` rules; `.open` slot added; foot conditional on being expanded |
| `src/lib/nav.ts` | Log after Rebase |
| `src/lib/chrome/chrome.test.ts` | one stale test replaced, three added |
| `src/lib/nav.test.ts` | three order tests added |
| `docs/screens.md` | the rail's shape and its order |

## Testing

The order is asserted as **the whole list**, not as a pair of indices. Asserting
only that Log follows Rebase would pass on a list that had lost an entry
somewhere else, and a hand-edited array of ten routes is exactly where that
happens.

`reaches the log search from the filter field` asserted the deleted control; it
is replaced by a test that the field is **gone**, so it cannot return unnoticed.

## Risk

Low, and cosmetic. The one real risk is the collapsed rail, where two controls
moved and a container became conditional — covered by `FEAT-030-T3`.

## Rollback

Revert the branch. Markup, two style rules and one array order.
