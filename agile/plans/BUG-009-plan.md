<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-009 — Plan

**Item:** [`agile/items/BUG-009-message-column-has-no-handle.md`](../items/BUG-009-message-column-has-no-handle.md)
**Branch:** `task/TASK-009-network-copy`
**Status:** implemented.

## Approach

Move the last column's divider inside it.

The instinct on a report of "cannot resize" is to look at the resize logic, and
that is where the time would have gone. The store was never the problem:
`message` is `fills` but not `computed`, `columns.resize` refuses only
`computed`, and `startResize` measures the cell precisely so a filling column
with a stored width of `0` does not snap to its minimum. Every part of FEAT-025's
intent was implemented.

`.divider` is `right: -3px; width: 7px`, straddling the boundary between two
columns — which is correct, and is what makes a divider feel like it belongs to
the columns on both sides of it. It is wrong for exactly one divider: the last,
which has nothing on its right but the window edge. Three of its seven pixels
land outside the container and the rest sit against the frame.

So the fix is a single rule on the last divider, and `::after` moves with it so
nothing about the appearance changes.

### Why not reorder, or hide the last divider

Making the message column not-last would fix this instance and leave whichever
column *is* last unresizable. Hiding the last divider admits the column cannot be
sized, which is what FEAT-025 set out to fix. The handle is the thing that is
wrong, so the handle is what moves.

## Files

`src/lib/graph/GraphHeader.svelte` — `class:last`, two rules.
`src/lib/graph/columns.test.ts` — five assertions.

## Testing

The assertions read the stylesheet rather than a rendered header, following
`src/lib/ui/btn.test.ts`: the environment applies no CSS, so a geometry
assertion would pass whatever the rules said. What is checked is the rule, the
markup that makes it apply, and — from the other side — that the store still
accepts a resize of the filling column and still refuses the computed one, since
that half was never broken and must not become so.

## Risk

Low, and confined to one divider. The regression to watch is the *other*
dividers, covered by asserting `.divider` still carries `right: -3px`.

The wider consequence is deliberate: whichever column is last gets the inside
handle, so reordering columns keeps the property rather than moving the defect.

## Rollback

Revert the branch. Two CSS rules and one class.
