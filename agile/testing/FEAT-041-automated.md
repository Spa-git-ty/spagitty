<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-041 — Automated tests

**Item:** [`agile/items/FEAT-041-rail-drops-the-shortcut-hint.md`](../items/FEAT-041-rail-drops-the-shortcut-hint.md)
**Files:** `src/lib/nav.test.ts` and `src/lib/chrome/chrome.test.ts`.

## Tests

| Test | Holds in place |
| --- | --- |
| `names no keyboard shortcut, in any notation (FEAT-041)` | no rail item advertises a shortcut — asserted over the **serialised** `NAV_ITEMS`, so a shortcut smuggled back under a different property name fails too |
| `names no shortcut on the Log item (FEAT-041)` | the same, rendered: the Log item carries no `Ctrl`, `Cmd` or `⌘` |
| `shows nothing beside a screen that has no count (FEAT-041)` | Settings, Pull requests and Rebase all render as their label alone — the dot is gone, and the three items in the same position agree |

## The test this replaces

`never both counts and hints on the same item` existed because the rail draws one
right-aligned value and an item asking for both would silently lose one. With
`hint` deleted from `NavItem`, that state cannot be expressed, so the test is
replaced rather than kept — a test for an impossible shape is noise.

## Still covered elsewhere, and deliberately untouched

- **The shortcut works.** `Ctrl/Cmd+F` is handled in `+layout.svelte` and goes
  to `/search?focus=1`. This item does not change it, and its existing coverage
  is unchanged.
- **The count dot.** `shows a dot, not a number, for a count nothing has
  computed` still passes: `·` for a `null` count is a convention worth keeping,
  and it is the reason Settings' decorative dot had to go.
- **The title bar.** `carries no shortcut hint, because the one it carried was
  wrong` — the same defect, removed from the other end of the chrome by
  FEAT-021.

## Coverage

1306 tests across 56 files, all passing. The change deletes a branch
(`item.hint ?? ''`) rather than adding one.

## Not covered here

That the rail *looks* balanced with the column empty on three items — the sweep,
`FEAT-041-T2`.
