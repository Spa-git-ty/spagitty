<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-006 — Plan

**Item:** [`agile/items/BUG-006-repo-card-branch-overlap.md`](../items/BUG-006-repo-card-branch-overlap.md)
**Branch:** `bugfix/BUG-006-repo-card-overlap`, stacked on `task/TASK-005-branch-coverage-floor`
**Status:** implemented.

## Approach

Fix the cause, at the level the cause lives at.

The triage note written before the screenshot arrived guessed at three
candidates: the card's missing `min-width: 0`, the `RefChip` inside `.branch`,
and `.path`'s `direction: rtl`. The screenshot settled it — the overlap is the
chip over the count, so the chip is the element and the other two are left alone.

**The fix goes in `RefChip.svelte`, not in `RepoCard.svelte`.** The chip already
declares `max-width`, `overflow: hidden`, `text-overflow: ellipsis` and
`white-space: nowrap` — it is a component that has *promised* to ellipsise and
does not keep the promise anywhere it is a flex item. Patching only the All
repositories card would leave that promise broken everywhere else the chip is
used and guarantee the same bug is reported again from another screen. One rule
on the component fixes every consumer.

The second half is a judgement about which element gives way. Both the name and
the count could shrink; only one should. `flex: none` on the count says the
branch name is what truncates — it has an ellipsis and a `title` to fall back
on, while "7 branches" is four characters that carry all of their meaning and
have nowhere to degrade to.

### Alternative considered and rejected

Giving `.branch` a `grid-template-columns: minmax(0, auto) auto` instead. It
works, but it fixes one screen and leaves the component still lying about what
it does, so the next flex context using a `RefChip` reintroduces the defect.

## Files

| File | Change |
| --- | --- |
| `src/lib/ui/RefChip.svelte` | `min-width: 0` on `.ref`, with a comment naming the flexbox automatic-minimum-size rule that caused it |
| `src/lib/repos/RepoCard.svelte` | `count` class on the branch-count span; `.branch .count { flex: none }` |
| `src/lib/repos/RepoCard.test.ts` | one rendering test and a four-test `BUG-006` group |

## Testing

The regression test reads the **stylesheet source** rather than a rendered card,
following the precedent `src/lib/ui/btn.test.ts` set for BUG-002 and for the
same reason: the test environment mounts components without applying any CSS, so
a `getComputedStyle` assertion here would report the same value whether the rule
exists or not. It would be a test that cannot fail, which Amendment 10 calls
padding.

What is asserted instead is the rule that caused the defect, plus the four rules
it works together with — because `min-width: 0` alone does nothing if someone
later removes the `overflow: hidden` beside it.

**Verified to fail without the fix** (Amendment 9): removing the `min-width: 0`
line from `RefChip.svelte` and re-running gives

```
× lets the chip shrink below its content width
  Tests  1 failed | 15 passed (16)
```

## Risks and rollback

**Risk: low, but not zero.** `min-width: 0` on `.ref` changes shrink behaviour
for *every* `RefChip` in the application — the graph's ref column, the branches
table, the commit detail. In each of those the chip previously refused to shrink;
now it will truncate instead. That is the intended behaviour everywhere, and the
`title` attribute already carries the full name in every case, but it is a
visible change beyond the screen that was reported. Called out here rather than
discovered later.

The manual sweep therefore walks every screen that renders a chip, not only All
repositories.

**Rollback:** revert the branch. Two CSS declarations and a class name; nothing
else depends on them.

## Sequencing

Stacked on `task/TASK-005-branch-coverage-floor` rather than cut from `dev`
directly. `dev` is 28 commits behind `main` and does not yet carry TASK-005, so
a branch cut straight from it would open a pull request that is red on gate 3
for reasons that have nothing to do with this fix. TASK-005 merges first, then
this.

## Verification

```
npx vitest run --coverage   # all four metrics ≥ 70%, with TASK-005 underneath
npm run check               # 0 errors, 0 warnings
```
