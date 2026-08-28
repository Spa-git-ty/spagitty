<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-041 — Plan

**Item:** [`agile/items/FEAT-041-rail-drops-the-shortcut-hint.md`](../items/FEAT-041-rail-drops-the-shortcut-hint.md)
**Branch:** `feature/FEAT-041-drop-log-hint`
**Status:** implemented.

## Approach

Delete the field, not just the string.

The reported change is one property on one item. Doing only that leaves
`hint?: string` on `NavItem`, one remaining user of it — Settings' `·` — and a
rail whose right column means "a count, unless it doesn't". Deleting the field
makes the column mean one thing: this screen's count, or nothing.

That is three small edits:

1. `NAV_ITEMS` — drop `hint` from Log and from Settings.
2. `NavItem` — drop the optional property.
3. `NavRail.svelte` — `{item.count ? countLabel(item.count) : ''}`.

### Why the shortcut is not moved somewhere else in the rail

It is already somewhere else. `Ctrl/Cmd+P` opens the palette, `commands.ts`
gives `go.search` the shortcut `${MOD}F`, and `MOD` is `⌘` or `Ctrl+` by
platform. One place that is right on every platform beats two places that
disagree on one.

### Why Settings' dot cannot stay

`countLabel` renders `·` for `null`, which the rail's own test calls *a count
nothing has computed*. Settings has no count in `RepoCounts` and is not waiting
for one. Keeping the dot would keep a false "pending" mark, and would leave the
`hint` field alive for exactly one decorative character.

## Files

`src/lib/nav.ts` — the interface and two entries.
`src/lib/chrome/NavRail.svelte` — the right-hand cell.
`src/lib/nav.test.ts` — the shape assertion, rewritten.
`src/lib/chrome/chrome.test.ts` — two rail assertions.

## Testing

The old test — *never both counts and hints on the same item* — exists because
the rail draws one right-aligned value and an item asking for both would lose
one silently. With the field gone that failure is impossible, so the test is
replaced rather than kept: one assertion that no rail item names a shortcut in
any notation, and two rendered assertions that the Log item shows no shortcut
and Settings shows nothing.

The shortcut itself keeps its existing coverage in the layout's keyboard tests;
this item must not change it, and the sweep checks it by hand as well.

## Risk

Very low. No behaviour changes; the rail loses two characters of text.

The one thing to watch is a future item wanting a right-aligned string that is
not a count. It would have to add the field back, deliberately, with a reason —
which is the point.

## Rollback

Revert the branch.
