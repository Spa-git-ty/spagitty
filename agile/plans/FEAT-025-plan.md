<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-025 — Plan

## Decisions

**A stored width is the flag.** The alternative — a `fills` boolean the user
toggles alongside a width — is two facts about one column that can contradict
each other. `widths.message === undefined` means "no opinion, take what is
left"; a number means "this wide". Clearing it is the way back, which is what
double-click on the divider does.

**The drag starts from the measured width.** `columns.width('message')` is 0
until it has been dragged, so reading the store would snap the column to its
minimum on the first pixel of movement. The header cell knows how wide it
actually is; that is the number a drag continues from.

**One scroll offset, not two scrollers.** The header must stay put while the
rows scroll vertically, so it cannot be inside their scroller. It is translated
by the rows' `scrollLeft` instead, and so is the lane layer. Two scrollers kept
in step by listening to each other is exactly the shape that produced BUG-003.

## Files

| File | Change |
| --- | --- |
| `src/lib/graph/columns.svelte.ts` | `shown` resolves fill-or-width; `totalWidth`; `unsize`; `resize` no longer refuses a filling column. |
| `src/lib/graph/GraphHeader.svelte` | A divider on every column, measured drag start, double-click to reset, translated by `scrollLeft`. |
| `src/lib/graph/CommitRows.svelte` | Owns `scrollLeft` and the table width; passes both down. |
| `src/lib/graph/columns.test.ts` | New. |

## Risk

A table wider than the window means the lane layer has to scroll with the rows;
if it did not, the graph would leave its column again. It is translated by the
same number in the same expression, and BUG-003's tests still pass.

## Rollback

Revert. The message column goes back to filling always, and the table can never
exceed the window.
