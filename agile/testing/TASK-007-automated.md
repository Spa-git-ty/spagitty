<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-007 — Automated tests

**Item:** [`agile/items/TASK-007-copy-sweep.md`](../items/TASK-007-copy-sweep.md)
**Run:** `npx vitest run` — 825 tests, 49 files, all passing.
**Typecheck:** `npm run check` — 985 files, 0 errors, 0 warnings.

## What was added

| Layer | Test | Asserts |
| --- | --- | --- |
| Store | `store.test.ts` — "still accepts the old `#advanced` fragment" | `showFromHash('#advanced')` and `showFromHash('advanced')` both select `license` |

**Why this one is real and not padding.** Without the redirect the test fails:
`isSection('advanced')` is now `false`, so `showFromHash` matches nothing and
silently leaves the section where it was. The failure mode it guards is a link
that quietly does nothing, which is exactly the kind that is never noticed.

The test also exercises both call shapes — with and without the leading `#` —
because the redirect sits before the `#`-stripping branch's own check and could
be written to catch only one of them.

## What was updated

| File | Change | Why |
| --- | --- | --- |
| `src/lib/rebase/panes.test.ts:241` | `toContain('⌥')` → `toContain('Alt+')` | It pinned the drag handle's title, which this item rewrites. The assertion still tests what it was written to test. |
| `src/lib/settings/sections.test.ts` | import, `describe` name and four `render` calls follow `AdvancedSection` → `LicenseSection` | The component moved by `git mv`. |
| `src/lib/settings/store.test.ts` | "takes a fragment with no hash character" now uses `appearance` | It was using `advanced` incidentally, to prove a fragment works without its `#`. Repointed at a section that still exists rather than deleted, so the original property is still covered — and the `advanced` case is now covered deliberately by the new test above. |

## Coverage

No new first-party branches. This item removes text, replaces string literals and
renames a section; the one behavioural addition is the `advanced` redirect, and
it is covered.

Measured on this branch, which is cut from `main` and therefore does **not**
carry TASK-005:

| Metric | Value | Floor |
| --- | --- | --- |
| Statements | 78.9% | 70% — pass |
| Branches | 62.7% | 70% — **fail, pre-existing** |
| Functions | 75.2% | 70% — pass |
| Lines | 78.4% | 70% — pass |

That branch figure is TASK-005's subject, not this item's: it is the same
62.66% failing on `main` today, and TASK-005 takes it to 71.89%. This item adds
one covered branch and removes none, so it moves the number in the right
direction and cannot be the cause of the shortfall.

**Before this opens as a pull request, TASK-005 must have merged**, or gate 3
fails for a reason that has nothing to do with a copy sweep. Sequencing recorded
in the plan.

## Not covered here

- That the removed sentences are gone from the *rendered* screens. The route
  components are not mounted in this suite, and asserting on a deletion by
  grepping the source would be a test that passes for the wrong reason. It is
  `TASK-007-T1` to `T6` in the manual sweep.
- That no footer renders as an empty bordered strip. Visual, and headless
  verification cannot see a border. `TASK-007-T7`.
