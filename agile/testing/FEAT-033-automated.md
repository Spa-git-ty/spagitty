<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-033 — Automated tests

**Item:** [`agile/items/FEAT-033-branch-divergence-on-the-chip.md`](../items/FEAT-033-branch-divergence-on-the-chip.md)
**Plan:** [`agile/plans/FEAT-033-plan.md`](../plans/FEAT-033-plan.md)

## What was written

| Test | Layer | What it asserts |
| --- | --- | --- |
| `the_chip_and_the_row_never_disagree_about_the_drift` | `crates/spagitty-core/src/branches.rs` | The chip's counts and the Branches row's counts are equal, and so is the upstream name. The item's own criterion, asserted directly — what it is really testing is that neither consumer recomputes. |
| `a_level_branch_is_marked_level_rather_than_left_to_the_caller` | `crates/spagitty-core/src/branches.rs` | `level()` is the core's answer, so the two screens cannot define "level" differently. |
| `a_branch_with_no_upstream_is_absent_from_the_map` | `crates/spagitty-core/src/branches.rs` | Absent, not zeroed. "Level" and "nothing to compare against" are different answers and a chip must not draw the first for the second. |
| `ahead_and_behind_match_git` | `crates/spagitty-core/src/branches.rs` | Unchanged, and now covering the shared read: the rows go through `divergences` too, so this test protects both consumers. |
| `shows how far the branch has drifted, behind then ahead` | `src/lib/ui/ui.test.ts` | `↓3` then `↑2` — the same order the Branches screen's bar draws. |
| `shows one side only when the drift is one-sided` | `src/lib/ui/ui.test.ts` | The zero side is absent rather than drawn as `↑0`. |
| `says nothing at all when the branch is level` | `src/lib/ui/ui.test.ts` | No `.drift` at all. `0/0` on every row is noise on every row. |
| `says nothing when there is no upstream to have drifted from` | `src/lib/ui/ui.test.ts` | The other silent case. |
| `keeps the whole sentence in the title, so the arrows are never the only telling` | `src/lib/ui/ui.test.ts` | The name, the counts, the upstream and how fresh they are — the same sentence the Branches screen uses. |
| `says a level branch is level in the title, even saying nothing on the chip` | `src/lib/ui/ui.test.ts` | The one case where the mark and the tooltip deliberately disagree: silence is about crowding, and the question still deserves an answer. |

## What was changed

Chip fixtures in six files gained `divergence`. Five took `null`; the one in
`StashList.svelte` takes `null` with a reason written beside it — a stash's
branch name is a label rather than a live ref to compare.

## What is not covered

- **The graph gutter's crowding.** Whether a chip with a drift still fits beside
  a long branch name at a narrow Graph column is a judgement, and it is
  SWEEP-033-04.
- **The colours.** `--lane-1` and `--lane-2` are asserted only as class names;
  that they are the *same* two the bar uses is SWEEP-033-03.
