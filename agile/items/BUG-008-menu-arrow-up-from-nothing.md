<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-008 — ArrowUp into a fresh menu lands in the middle

**Status:** Fixed on `bugfix/BUG-008-menu-arrow-up-from-nothing`.
**Found by:** TASK-005, while writing `src/lib/ui/Menu.test.ts`.
**Screen:** every one — `Menu.svelte` is every right-click menu in Spagitty.

## Problem

Opening a menu and pressing **ArrowUp** as the first key selects the wrong entry.
It should select the last one. It selects `usable.length - 2`.

## Reproduction

1. Right-click any commit row.
2. Press `ArrowUp` without pressing anything else first.
3. The highlight lands on the second-from-last entry, not the last.

## Observed versus expected

| Menu size | Observed | Expected |
| --- | --- | --- |
| 5 entries | index 3 | index 4 |
| 3 entries | index 1 — the middle | index 2 |
| 2 entries | index 0 — the first | index 1 |
| 1 entry | index 0 | index 0 (correct by luck) |

ArrowDown is correct at every size.

## Cause

`step()` derives "where the cursor is now" from `entries[cursor]`, and `cursor`
starts at `-1`:

```ts
const current = usable.findIndex((entry) => entry === entries[cursor]);
const next = (current + delta + usable.length) % usable.length;
```

`entries[-1]` is `undefined`, no entry equals it, so `findIndex` answers `-1`.
Down works out by accident — `-1 + 1` is the first entry, which is right. Up
gives `(-1 - 1 + n) % n`, which is `n - 2`: a different wrong answer for every
menu length, and only correct for a one-entry menu.

## Fix

With no cursor there is no "current" to step from, so the direction alone
decides: down opens at the first entry, up at the last. That is what every other
menu on the machine does and what the key means.

## Acceptance criteria

- ArrowUp as the first key selects the last entry that can run.
- ArrowDown as the first key selects the first entry that can run.
- Both hold for menu lengths 1, 2, 3 and 5 — the old answer was wrong
  differently at each, so a single-length test would pass several wrong
  implementations.
- Disabled entries are still skipped when opening in either direction.

## Dependencies

None. Independent of BUG-007, which is the other defect TASK-005 turned up.
