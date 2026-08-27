<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-003 — Plan

## Approach

The choice was between computing the offset and not needing one.

**Computing it** — sum the widths of the shown columns before `graph` and pass
that as `left` — works, and re-derives in TypeScript something the browser
already knows. It also has an unanswerable case: the Commit Message column takes
the leftover width, so if it is ever ordered before the Graph its width is not
in the store at all, only in the layout.

**Not needing one** is what shipped. A layer with the same flex structure as a
row — spacers with the cells' widths, a filling gap where a filling column is,
the canvas in the Graph's slot — is placed by the same engine, with the same
inputs, at the same time. There is no number to keep in step, and the failure
mode that produced this bug cannot recur.

Cost: one extra element per column in one layer, none of which paint anything.
Cheaper than the arithmetic it replaces.

## Files

| File | Change |
| --- | --- |
| `src/lib/graph/CommitRows.svelte` | The layer, and the slot that clips the canvas. |
| `src/lib/graph/LaneCanvas.svelte` | `left: 0` inside its slot; stops reading `--refs-gutter-w`. |
| `src/lib/graph/rows.test.ts` | Four tests that resize and reorder before asserting. |

## Steps

1. Layer and slot; canvas positioned by them.
2. Tests that fail against the old positioning.
3. Records.

## Risk

The layer sits over the rows, so it must not swallow clicks — `pointer-events:
none`, as the canvas already had. Covered by the existing row-interaction tests,
which still pass.

## Rollback

Revert. The graph returns to being correct only at the default widths.
