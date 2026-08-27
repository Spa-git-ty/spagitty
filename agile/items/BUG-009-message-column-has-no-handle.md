<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-009 — The commit message column cannot be resized

**Status:** Fixed on `task/TASK-009-network-copy`.
**Screen:** Graph (1A).
**Reported by:** the author, running the build.

## Problem

Dragging the Commit Message column's divider does nothing. There is no handle to
grab.

## Reproduction

1. Open the Graph screen with the default column layout.
2. Try to drag the right edge of the Commit Message column.
3. Nothing happens — the pointer never finds a `col-resize` cursor.

## Cause — corrected 2026-08-18

**The first diagnosis was wrong and is left here rather than quietly replaced.**
It said the last column's divider fell off the window edge. It does not: the
graph screen has a `Splitter` between the table and the commit detail panel, so
the message column's right boundary abuts that splitter rather than the window.
Pulling the divider inside (`right: 0`) is still right — it moves the grab area
off a control that belongs to something else — but it was not the whole story,
and on its own it did not give the author a handle they could find.

The author's screenshots showed them reaching for the **left** boundary, between
Graph and Commit Message. That is the graph column's divider, and it is
deliberately fixed.

## The real cause

The message column's two boundaries both belong to something else:

| Boundary | Owner | Draggable? |
| --- | --- | --- |
| left, Graph \| Message | the graph column's divider | **No** — the graph's width is computed from the lanes on screen |
| right, Message \| detail panel | abuts the detail `Splitter` | Only after `right: 0`, and it is not where anyone reaches |

So the column that most wants sizing had no handle anyone would find, and the
one boundary people do reach for carried a divider that did nothing at all.

## Original cause note

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
