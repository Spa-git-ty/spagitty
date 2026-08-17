<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-025 — A table you can size, and one that scrolls sideways

**Status:** Built. Plan in `agile/plans/FEAT-025-plan.md`, tests in
`agile/testing/FEAT-025-automated.md` and `agile/testing/FEAT-025-sweep.md`.
**Screen:** Graph (1A).

## Problem

The Commit Message column was the one column with no drag handle. It takes the
leftover width, and `GraphHeader` only rendered a divider for columns that do
not fill — so the column people read most was the one they could not size. The
author reported it as "comments area not resizable".

The knock-on: with every other column bounded and the message soaking up the
rest, the table could never be wider than the window, so long branch names had
nowhere to go but ellipsis.

## What was built

- **The message column fills until it is dragged.** A stored width is what both
  gives it a size and stops it filling — one fact, not a width plus a flag that
  could disagree with it. Double-clicking its divider clears the width and hands
  the fill back.
- **The drag starts from the measured width**, not from the stored one. The
  filling column's stored width is 0, and starting a drag there would snap it to
  its 160px minimum before the pointer had moved.
- **The rows scroll horizontally** once the columns total more than the window.
  The header is moved by the same offset rather than being a second scroller,
  and the lane layer moves with it — three things, one number, so they cannot
  drift apart. That is deliberate: two scrollers listening to each other is how
  BUG-003 would come back.
- Long branch names now have somewhere to go: widen Branch/Tag and scroll to it.

## Acceptance criteria

1. The Commit Message column has a divider and can be dragged. ✔
2. Dragging it stops it filling; double-clicking the divider restores the fill. ✔
3. It cannot be dragged below 160px. ✔
4. The Graph column still refuses to be dragged — its width is the lanes on
   screen. ✔
5. When the columns are wider than the window, the rows scroll sideways and the
   header and lanes follow exactly. ✔
6. Widths survive a restart, per repository, as they already did. ✔

## Non-scope

- A minimum window width, or reflowing columns when the window is very narrow.
- Sizing the columns from the keyboard.

## Dependencies

FEAT-022 (the column model), BUG-003 (the lane layer this scrolls with).
