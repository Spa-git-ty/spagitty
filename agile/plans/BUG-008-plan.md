<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-008 — Plan

**Item:** [`agile/items/BUG-008-menu-arrow-up-from-nothing.md`](../items/BUG-008-menu-arrow-up-from-nothing.md)
**Branch:** `bugfix/BUG-008-menu-arrow-up-from-nothing`
**Status:** implemented.

## Approach

`step()` treats `cursor === -1` as a position to step *from*. It is not one —
it is the absence of a position, and the modulo arithmetic that works for a real
index produces `n - 2` for it.

The fix separates the two cases rather than trying to make one formula serve
both. With no cursor there is nothing to step from, so the direction alone
decides the answer: down opens at the first entry, up at the last.

```ts
const next =
    current === -1
        ? delta > 0 ? 0 : usable.length - 1
        : (current + delta + usable.length) % usable.length;
```

`usable` is already the disabled-filtered list, so opening upward lands on the
last entry that can actually run — the disabled case comes free rather than
needing its own branch.

### Alternative rejected

Initialising `cursor` to `0` on mount. It makes ArrowUp arithmetic work, but it
also puts a highlight on the first entry the moment a menu opens, which says
"this is selected, press Enter" to someone who has only right-clicked. The menu
deliberately opens with nothing selected.

## Files

| File | Change |
| --- | --- |
| `src/lib/ui/Menu.svelte` | `step()` handles the no-cursor case explicitly, with a comment naming the `entries[-1]` cause |
| `src/lib/ui/Menu.test.ts` | three tests added |

## Testing

The regression tests walk menu lengths **1, 2, 3 and 5**, because the old answer
was wrong differently at each — index 0 for a two-entry menu, the middle for
three — and a single-length test would have been passed by several wrong
implementations. Each failure message names the length and where it landed.

A third test covers the disabled case: opening upward must land on the last entry
that can run, not on a disabled one below it.

Verified to fail without the fix (Amendment 9):

```
× opens at the last entry when the first key pressed is ArrowUp
  AssertionError: ArrowUp into a 2-entry menu landed on 0: expected +0 to be 1
× opens at the last entry that can run, not a disabled one
  Tests  2 failed | 24 passed (26)
```

## Risk

Low. The changed path is reachable only when `cursor` is `-1`, which is exactly
the state that was broken; every subsequent press takes the unchanged branch.
The existing wrap-around and skip-disabled tests pass unmodified, which is the
evidence that the working half was not disturbed.

## Rollback

Revert the branch. One expression.
