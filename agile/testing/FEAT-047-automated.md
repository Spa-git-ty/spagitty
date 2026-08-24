<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-047 — Automated tests

**Item:** [`agile/items/FEAT-047-branch-table-columns-and-divergence.md`](../items/FEAT-047-branch-table-columns-and-divergence.md)
**Plan:** [`agile/plans/FEAT-047-plan.md`](../plans/FEAT-047-plan.md)

## What was written

| Test | Layer | What it asserts |
| --- | --- | --- |
| `is the largest single side, in either direction` | `src/lib/branches/divergence.test.ts` | `widest()` takes the maximum across both directions and all rows — the scale every bar is drawn against. |
| `is zero when nothing has an upstream, so nothing divides by it` | `src/lib/branches/divergence.test.ts` | An all-null screen, and an empty screen, both give 0 rather than `-Infinity` or `NaN`. |
| `has no bar without an upstream` | `src/lib/branches/divergence.test.ts` | State `none`, both segments 0. The criterion that this case is not a dash and not an empty bar. |
| `is level with an upstream and no distance` | `src/lib/branches/divergence.test.ts` | State `level`, distinct from `none`, which is what makes the tick meaningful. |
| `fills one side only when the drift is one-sided` | `src/lib/branches/divergence.test.ts` | Ahead-only and behind-only each fill their own half and leave the other at 0. |
| `fills both sides independently when the branch is both` | `src/lib/branches/divergence.test.ts` | 5 ahead against 10 behind, maximum 10: 100% and 50%. The case the author said read worst as text. |
| `is the same across rows, so two rows can be compared by eye` | `src/lib/branches/divergence.test.ts` | Two rows scaled against one maximum give 25% and 100% — the per-screen scale, asserted rather than assumed. |
| `never paints a real commit as nothing` | `src/lib/branches/divergence.test.ts` | 1 against a maximum of 400 is the 12% floor, not a bar of no width. |
| `never paints nothing as a commit` | `src/lib/branches/divergence.test.ts` | The floor does not lift an empty side off zero. |
| `fills the half when there is nothing to scale against` | `src/lib/branches/divergence.test.ts` | A stale maximum of 0 with real counts gives 100%, not a division by zero. |
| `says so when there is no upstream` / `names the upstream when the branch is level with it` / `gives both counts and says how fresh they are` | `src/lib/branches/divergence.test.ts` | The three sentences the cell carries in `title`. Nothing on this screen is glyph-only. |
| `is the design’s four columns, in the design’s order` | `src/lib/branches/columns.test.ts` | The default order the table paints before anyone drags anything. |
| `gives the leftover width to the branch name` | `src/lib/branches/columns.test.ts` | The branch name fills, so `totalWidth` is null and nothing scrolls sideways. |
| `gives the divergence bar more room than the arrows had` | `src/lib/branches/columns.test.ts` | Width 150, minimum 90 — the 90px cell became the floor, not the size. |
| `writes under its own prefix, so it cannot land on the graph` | `src/lib/branches/columns.test.ts` | A width written here appears under `spagitty.branches.columns:` and the graph's key stays empty. This is the failure that would otherwise only show up on somebody else's screen. |
| `remembers a width per repository` | `src/lib/branches/columns.test.ts` | A width set against one repository does not follow the user to another, and is still there on the way back. |
| `keeps the layout on screen when no repository is open` | `src/lib/branches/columns.test.ts` | A null path does not flash the table back to its defaults. |
| `hands a dragged width back, which is what the double-click does` | `src/lib/branches/columns.test.ts` | `unsize` returns the filling column to filling — the only way back once it has been dragged. |
| `draws the divergence as a bar, one side per direction` | `src/lib/branches/BranchTable.test.ts` | Four rows, one per state, asserted on the rendered segment widths rather than on text: `0/50`, `100/0`, `100/50`, `0/0`, one accented tick, and the counts beside them. |
| `draws no bar at all when there is no upstream to compare against` | `src/lib/branches/BranchTable.test.ts` | No `.bar` in the row, the words `no upstream`, and the sentence in `title`. |
| `names the upstream and says the counts are as of the last fetch` | `src/lib/branches/BranchTable.test.ts` | The bar's `title` and its `aria-label` both carry the sentence. |
| `resizes a column, and hands the width back on a double-click` | `src/lib/branches/BranchTable.test.ts` | A width set on the store reaches the rendered header cell, and `unsize` puts it back. The acceptance criterion "can be dragged, and come back that way", one layer below the pointer. |
| `refuses to shrink a column past what it can say anything in` | `src/lib/branches/BranchTable.test.ts` | 10px against a 90px minimum renders as 90px. |

## What was changed

Three assertions in `BranchTable.test.ts` were rewritten rather than kept: they
asserted `↑2 ↓3`, the dash for no upstream, and the `title` on the `.drift`
cell. All three describe the interface this item replaces. The behaviour they
were protecting — that every state is distinguishable and that the sentence
survives — is asserted again above, on the shape that replaced them.

## What is not covered

- **The pointer itself.** The resize tests drive the store, not a drag. Pointer
  capture, `getBoundingClientRect` and the divider's hit area are happy-dom's
  weakest ground; the drag is SWEEP-047-01's job.
- **How the bar looks.** The tests assert percentages and structure. Whether
  four states are distinguishable *at a glance* is a judgement, and it is what
  SWEEP-047-03 is for.
- **The graph's columns.** Asserted by not being touched: `$lib/ui/columns.svelte`
  is unchanged, and the graph's own suite still passes unmodified.
