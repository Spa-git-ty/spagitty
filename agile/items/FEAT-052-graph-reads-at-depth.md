<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-052 — The graph reads at depth

**Status:** Done. Plan: [`agile/plans/FEAT-052-plan.md`](../plans/FEAT-052-plan.md).
**Screen:** Graph (1A).
**Raised by:** the author, with two screenshots of `git/git` side by side —
Spagitty and a commercial client — before the first public release.

## Problem

On a deep history the graph column is not a graph. `git/git` has a mean lane
depth of 187, and at that depth Spagitty draws a picket fence: forty-eight
vertical lines three and a half pixels apart, no one of which can be followed
from one row to the next. The client beside it, on the same repository at the
same moment, is readable.

Three separate causes, which is why it looked worse than any one of them:

1. **The lanes are too close.** `LANE_PITCH_MIN` was 6px. The reasoning written
   down for it was that a 2.5px stroke at a 6px pitch keeps 3.5px of daylight —
   "thin, but two lines rather than a band". The screenshot shows a band. The
   arithmetic was right and the premise was wrong.
2. **The ref chips have a ragged left edge.** They were right-aligned against
   the graph, so the first chip on every row starts at a different x depending
   on how wide it is. On a repository with refs on many rows that reads as
   scatter rather than as a column.
3. **Nothing says the table continues sideways.** The columns can be dragged
   wider than the window, and when they are, the only clue is an overlay
   scrollbar that is invisible until you are already scrolling — which is no
   help at all to somebody deciding whether there is anything over there.

## Why it was not caught

The fixture repository is eleven commits and four branches. Every screen was
checked against it, and at four lanes none of this is visible: the pitch never
compresses, refs fit whatever their alignment, and the table never overflows.

The gap analysis had already recorded that `git/git` needs 187 lanes. What was
missing was ever *looking* at one.

## Scope

- A lane pitch that keeps two lanes tellable apart at any depth.
- Ref chips that start at a fixed x.
- An edge affordance that appears exactly when content is hidden under it.

## Non-scope

- **More lane colours.** Five hues cycling across twenty-one lanes still repeats
  every fifth lane. Widening the cycle is a real improvement and it is eight
  palettes of hand-picked colour, which is its own item and its own review.
- **Making `git/git` fully legible.** 382 lanes defeat any width. Every client
  folds there, including the one this was compared against.

## Dependencies

FEAT-035, which built the compression this retunes. FEAT-039 and FEAT-025, which
made the columns draggable and the table scrollable in the first place.
