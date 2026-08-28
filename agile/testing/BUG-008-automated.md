<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-008 — Automated tests

**Item:** [`agile/items/BUG-008-menu-arrow-up-from-nothing.md`](../items/BUG-008-menu-arrow-up-from-nothing.md)
**File:** `src/lib/ui/Menu.test.ts` — 26 tests, all passing.

## Added

| Test | Asserts |
| --- | --- |
| `opens at the last entry when the first key pressed is ArrowUp` | For menu lengths **1, 2, 3 and 5**, ArrowUp as the first key lands on index `size - 1` |
| `opens at the first entry when the first key pressed is ArrowDown` | Same lengths, ArrowDown lands on index `0`. Guards the half that was accidentally correct, so a fix cannot break it |
| `opens at the last entry that can run, not a disabled one` | With a disabled last entry, ArrowUp lands on the last **enabled** one |

## Why four lengths and not one

The old answer was `usable.length - 2`, which is a *different* wrong index at
every menu size — index 0 for two entries, the middle for three, and correct by
luck for one. A test at a single length would have been passed by several wrong
implementations, including "always select index 0" and "always select the
middle". The assertions carry the length in their failure message so a
regression names itself.

## Regression proof

Restoring the old arithmetic:

```
× opens at the last entry when the first key pressed is ArrowUp
  AssertionError: ArrowUp into a 2-entry menu landed on 0: expected +0 to be 1
× opens at the last entry that can run, not a disabled one

  Tests  2 failed | 24 passed (26)
```

The ArrowDown test correctly keeps passing — it covers behaviour the defect never
touched, and it exists so a future fix cannot trade one direction for the other.

## Coverage

`Menu.svelte` stays at 98.66% statements / 90.9% branches. The new conditional's
three outcomes — no cursor going up, no cursor going down, and a real cursor —
are each exercised.

## Not covered here

Whether the highlight is *visible* where the test says it is. `.at` is asserted
as a class; that it renders as a legible highlight is `BUG-008-T1` in the sweep.
