<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-052 — Plan

**Item:** [`agile/items/FEAT-052-graph-reads-at-depth.md`](../items/FEAT-052-graph-reads-at-depth.md)
**Branch:** `feature/FEAT-019-commit-signing`
**Status:** implemented.

Continuing the unmerged stack rather than branching, because it is the last
thing before a release cut from it.

## Approach

### The pitch floor was wrong, and the comment said why it was right

`LANE_PITCH_MIN` went from 6 to **14** — half the design pitch, leaving 11.5px
between two strokes. The span then holds 21 lanes rather than 48.

Twenty-one is fewer, and that is the point. The old number optimised for the
count of lanes that could be given a *distinct x*, which is a property you can
verify in a unit test and cannot see on a screen. Three and a half pixels of
daylight is a number, not a gap. A history deep enough to need a twenty-second
lane was never going to have that lane read, and folding it is more honest than
drawing it indistinguishably.

`git/git` still overflows. 382 lanes defeat any width, and the client this was
compared against folds there too. The difference is that the twenty-one which
*are* drawn can be told apart.

**A guarantee got stronger on the way.** The node radius shrinks with the pitch,
and at a 6px pitch it hit the `MERGE_R` floor and nodes began to overlap — a
trade the tests recorded deliberately. At a 14px floor the radius bottoms out at
5, and `2 × 5 ≤ 14`, so a node never covers its neighbour's lane at any depth at
all. The test that recorded the trade now records its absence.

### Ref chips start where the column starts

`justify-content: flex-end` became `flex-start`. The old alignment tucked the
chips against the graph, meaning to sit them near the lane they label — but the
lane moves and the chips are not all the same width, so what it produced was a
different left edge on every row.

`+n` stays last, so overflow clips the summary rather than a name. That is the
right one to lose.

### An edge that says the table carries on

Two gradients, one per side, over the rows and taking no clicks. Each appears
exactly when there is content hidden under it: `scrollLeft > 0` on the left,
`scrollLeft + clientWidth < scrollWidth` on the right, with a pixel of slack so
fractional scroll positions at a non-integer zoom do not leave the right one lit
at the far end.

A gradient rather than a rule, deliberately: what it means is "this continues
underneath", and a hard line says "this stops here" — the opposite.

Measured from the element rather than derived from the column widths. Whether
the table overflows depends on a dragged width, a zoom and the window size, and
the element already knows all three. Measured on scroll *and* when the table
width changes, or the right edge would stay dark until the first sideways
scroll — the moment it stops being needed.

`--shadow-edge` is a new token in both grounds, in the same ink family as the
window's own depth and lighter than any of it: it sits on top of content
somebody is reading, so it has to register once and then stop being noticed.

## What this is not verified against

**A screenshot.** The change was checked by arithmetic and by tests; nobody has
looked at `git/git` in Spagitty since it was made. The fixture repository is
eleven commits, which is exactly why this was missed the first time, and
cloning `git/git` to look is what SWEEP-052-01 asks for.

That gap is the honest state of it. The numbers are defensible and the tests
pin them; whether 14px is enough rather than 16 or 18 is a question a screen
answers and a test cannot.

## What was not done

- **More lane colours.** Five hues across twenty-one lanes still repeats every
  fifth. It is the next real improvement and it is eight palettes of hand-picked
  colour — its own item.
- **Reducing what is drawn.** A lane with no node in the visible rows is still a
  full-height vertical. Drawing fewer of them is a bigger change to the walk
  than a release should carry.
