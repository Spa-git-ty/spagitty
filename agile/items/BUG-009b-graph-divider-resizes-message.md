<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-009b — The boundary people reach for carries a dead divider

**Status:** Fixed on `bugfix/BUG-009b-graph-divider-resizes-message`, commit
`51c62a0`.
**Screen:** Graph (1A).
**Reported by:** the author, with screenshots, after BUG-009's fix shipped and
the column still could not be sized.

## Why this is a second identifier

BUG-009 was closed on a diagnosis that turned out to be wrong. Amendment 12 says
identifiers are never reused, and reopening BUG-009 would have quietly replaced
a record that is worth keeping: the wrong diagnosis, and what corrected it, are
the useful part. So the correction carries its own identifier, and BUG-009's
document keeps its first cause section with the correction written over it
rather than in place of it.

## Problem

After BUG-009 shipped, the commit message column still had no handle anyone
would find.

## Reproduction

1. Open the Graph screen with the default columns.
2. Reach for the boundary between **Graph** and **Commit Message** — the one
   between the two columns, which is where a person actually aims.
3. The cursor changes and the divider is grabbable, but dragging it does
   nothing at all.

## Cause

BUG-009 said the last column's divider fell off the window edge. It does not:
the graph screen puts a `Splitter` between the table and the commit detail
panel, so the message column's right boundary abuts that splitter, not the
window. Moving the divider inside (`right: 0`) is still right — it takes the
grab area off a control belonging to something else — but on its own it gave
nobody a handle they would find.

The message column's two boundaries both belonged to something else:

| Boundary | Owner | Did dragging do anything? |
| --- | --- | --- |
| left, Graph \| Commit Message | the graph column's divider | **No.** The graph's width is computed from the lanes on screen, so its divider had nothing to size and was marked `fixed`. |
| right, Commit Message \| detail panel | abuts the detail `Splitter` | Only after BUG-009, and it is not where anyone reaches. |

So the one column that most wants sizing had no reachable handle, and the
boundary people do reach for carried a divider that did nothing at all.

## Observed versus expected

| | |
| --- | --- |
| **Observed** | The Graph \| Commit Message divider is inert; the message column cannot be sized in practice. |
| **Expected** | That boundary sizes the commit message column, and the boundary follows the pointer. |

## Fix

A **computed** column's divider sizes the column *after* it, with the drag
inverted so the boundary follows the pointer: dragging right makes the column on
the right narrower. That is what the gesture looks like it should do, and it is
the only reading under which this divider does anything.

A divider with nothing resizable on either side — a computed column followed by
another computed column, or by nothing — is still marked `fixed`, still says in
its title why, and still does nothing.

The title now names the column the divider will actually size, so the hover text
cannot promise one thing and do another.

## Acceptance criteria

- Dragging the Graph \| Commit Message boundary resizes the commit message
  column, and the boundary tracks the pointer.
- Double-clicking that divider resets the commit message column to filling.
- Every non-computed divider behaves exactly as before: sizes its own column,
  drags in the ordinary direction.
- A computed divider with no resizable column after it is still `fixed`.
- The divider's title names the column it sizes.

## Dependencies

BUG-009, whose fix is kept — the inside handle on the last divider is still
correct. FEAT-025, which made the filling column resizable in the store.

Adjacent: FEAT-039, which came out of the same screencast and makes the graph
column itself draggable, so this divider gained a second job later.
