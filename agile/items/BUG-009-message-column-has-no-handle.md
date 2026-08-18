<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-009 — The commit message column cannot be resized

**Status:** fixed on `task/TASK-009-network-copy`.
**Screen:** Graph (1A).
**Reported by:** the author, running the build.

## Problem

Dragging the Commit Message column's divider does nothing. There is no handle to
grab.

## Reproduction

1. Open the Graph screen with the default column layout.
2. Try to drag the right edge of the Commit Message column.
3. Nothing happens — the pointer never finds a `col-resize` cursor.

## Cause

**Not the store.** `message` is declared `fills: true` but not `computed`, and
`columns.resize` only refuses `computed` columns, so the store has always
accepted a resize. `startResize` even handles the filling column deliberately,
measuring the cell rather than reading a stored width of `0`.

The handle is the problem. `.divider` is positioned `right: -3px` with
`width: 7px`, straddling the boundary between two columns — which is what makes
it feel like it belongs to both, and is right for every divider except one.

The **last** column has nothing on its right but the window edge. Three of its
seven pixels are outside the container, and the remaining four sit against the
window frame. `DEFAULT_ORDER` is `['refs', 'graph', 'message']`, so the message
column is last by default and in practice had no handle at all.

FEAT-025's own doc comment says the message column "used to mean it had no drag
handle at all — the one column a person could not size" and that it now fills
*until dragged*. That intent was implemented in the store and defeated by three
pixels of CSS.

## Observed versus expected

| | |
| --- | --- |
| **Observed** | The last column's divider is unreachable; the message column cannot be sized. |
| **Expected** | Every shown column has a grabbable handle, including the last. |

## Fix

The last column's divider sits wholly inside it (`right: 0`), and its line moves
to the column's own edge so nothing about the appearance changes.

## Acceptance criteria

- The Commit Message column can be dragged narrower and back.
- Double-clicking its divider restores the fill.
- Every other divider still straddles its boundary as before.
- Reordering columns so a different one is last gives *that* one the inside
  handle.

## Dependencies

FEAT-025, which made the filling column resizable in the store.
