<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-026 — Plan

## Decisions

**The collapse lives in `panels.svelte.ts`, not in the rail.** Every other
component lays itself out against `--rail-w`; if the rail collapsed itself
without changing that variable, the layout would keep a rail-shaped hole beside
a rail that is no longer there. Collapsing therefore *is* a change to that one
number, published the same way the widths already are.

**The dragged width is kept.** Expanding returns the rail the user had. A
collapse that forgot it would be a reset wearing a collapse's clothes.

**Glyphs are data, on the nav items.** `nav.ts` already owns the label, route,
count and divider for each screen; the glyph belongs beside them rather than in
a lookup inside the component. They come from the same vocabulary the toolbar
uses, because the app ships no icon set and a rail of indistinguishable boxes
would be worse than no collapse.

**Names never disappear.** Collapsed items keep `title` and `aria-label`, so a
pointer and a screen reader both still get the screen's name.

## Files

| File | Change |
| --- | --- |
| `src/lib/panels.svelte.ts` | `railCollapsed`, `RAIL_COLLAPSED_W`, `toggleRail`, persistence. |
| `src/lib/nav.ts` | A `glyph` per item. |
| `src/lib/chrome/NavRail.svelte` | The button and the collapsed rendering. |
| `src/lib/ui/Splitter.svelte` | Inert while the rail is collapsed, by pointer and by key. |
| `src/lib/panels.test.ts` | Four tests. |

## Risk

Storage gains a field. `init` reads it defensively — a stored layout without it
simply leaves the rail expanded, which is what an older layout meant.

## Rollback

Revert. The rail is always expanded, and a stored `railCollapsed` is ignored.
