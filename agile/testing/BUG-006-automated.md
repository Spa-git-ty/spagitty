<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-006 — Automated tests

**Item:** [`agile/items/BUG-006-repo-card-branch-overlap.md`](../items/BUG-006-repo-card-branch-overlap.md)
**File:** `src/lib/repos/RepoCard.test.ts`
**Run:** `npx vitest run src/lib/repos/RepoCard.test.ts` — 16 tests, all passing.

## Why these assertions read CSS instead of a rendered card

The test environment mounts components without applying any stylesheet. A
`getComputedStyle(chip).minWidth` assertion would therefore return the same
value whether the rule exists or not — a test that passes no matter what the
code says, which Amendment 10 calls padding and does not accept as coverage.

`src/lib/ui/btn.test.ts` set this precedent for BUG-002, which was also a pure
specificity/rule defect, and states the reasoning at length. BUG-006 follows it.

What is asserted is the rule that caused the defect, at its source.

## Tests

| Layer | Test | Asserts |
| --- | --- | --- |
| Component | keeps a long branch name and the count as separate elements | With a 39-character branch name and `branches: 7`, both `.ref` and `.count` render, and neither has swallowed the other's text |
| Stylesheet | lets the chip shrink below its content width | `.ref` in `RefChip.svelte` declares `min-width: 0` — **the fix** |
| Stylesheet | still asks the chip to ellipsise rather than wrap | `.ref` still declares all four of `max-width: 100%`, `overflow: hidden`, `text-overflow: ellipsis`, `white-space: nowrap` |
| Stylesheet | holds the branch count at its full width | `.branch .count` in `RepoCard.svelte` declares `flex: none` |
| Stylesheet | keeps the row that holds them able to shrink | `.branch` still declares `min-width: 0` |

The second test exists because `min-width: 0` on its own does nothing useful: it
permits shrinking, and the other four rules are what turn the shrink into an
ellipsis. Removing any of them reintroduces the visible defect in a different
form, so all five are held together rather than only the line that changed.

## Regression proof

Amendment 9 requires a regression test that fails without the fix. Verified by
removing the `min-width: 0` line from `src/lib/ui/RefChip.svelte` and re-running:

```
× lets the chip shrink below its content width 3ms

 FAIL  src/lib/repos/RepoCard.test.ts > BUG-006 — the chip gives way before its
       neighbours > lets the chip shrink below its content width

      Tests  1 failed | 15 passed (16)
```

The line was then restored and the suite re-run clean.

## Coverage

BUG-006 changes CSS and one class name; it adds no branches to first-party
logic. Whole-project coverage on this branch, with `task/TASK-005-branch-coverage-floor`
underneath it, stays above the Amendment 10 floor on all four metrics:

| Metric | Value | Floor |
| --- | --- | --- |
| Statements | 86.88% | 70% — pass |
| Branches | 71.89% | 70% — pass |
| Functions | 84.19% | 70% — pass |
| Lines | 86.09% | 70% — pass |

Measured on the stack. Cut from `main` alone this branch reads 62.66% branches,
which is the pre-existing TASK-005 shortfall and not a figure this fix moves in
either direction.

## Not covered here

The visual result — that the ellipsis actually appears at a given card width —
cannot be asserted in this environment and is not faked. It is
`BUG-006-T1` in the manual sweep.
