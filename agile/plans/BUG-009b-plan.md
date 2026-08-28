<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-009b — Plan

**Item:** [`agile/items/BUG-009b-graph-divider-resizes-message.md`](../items/BUG-009b-graph-divider-resizes-message.md)
**Branch:** `bugfix/BUG-009b-graph-divider-resizes-message`
**Status:** implemented, in `51c62a0`.

## Approach

Give the dead divider the column after it.

`startResize` took a `ColumnId` — the column the handle sits on — and a computed
column's divider was simply wired to nothing. The change makes the *index* the
argument and puts one function between the handle and the store:

```
resizeTarget(index) -> { id, invert } | null
```

- not computed → sizes itself, `invert: false`. Every existing divider.
- computed, followed by a resizable column → sizes **that** column,
  `invert: true`.
- computed, followed by nothing resizable → `null`, and the divider stays
  `fixed`.

`moveResize` negates the travel when `invert` is set, so the boundary moves with
the pointer rather than against it. `startResize` measures
`parentElement.nextElementSibling` in the inverted case, for the same reason
BUG-009 measured the cell: the filling column's stored width is `0` until it is
dragged, and starting from `0` would snap it to its minimum before the pointer
moved.

Everything user-visible then follows from `resizeTarget`: `class:fixed` becomes
`target === null` rather than `column.computed`, and the title names the column
the divider will actually size.

### Why invert

The alternative is to drag right to widen the message column, which is
consistent with every other divider but sends the boundary the opposite way from
the pointer while the boundary is the thing under the finger. A divider is a
boundary before it is a column control. Following the pointer is the only
behaviour that does not look broken.

### Why not make the graph column resizable instead

That is a feature, not this fix, and it is FEAT-039. It also would not settle
what happens when the graph column is at its computed width and the user wants
the message column narrower. The dead handle is the defect; giving it a job is
the smallest change that removes it.

## Files

`src/lib/graph/GraphHeader.svelte` — `resizeTarget`, the two resize handlers,
and the divider's bindings.
`src/lib/graph/columns.test.ts` — five assertions, in their own `describe`.

## Testing

Same reasoning as BUG-009: the environment applies no stylesheet and pointer
capture against a zero-size layout proves nothing, so the assertions read the
component source for the decisions that define the behaviour — the branch, the
inversion, the measured cell, the `fixed` fallback, and the title. The store's
own resize rules are already covered by BUG-009's tests and are untouched here.

## Risk

Medium, and it is a behaviour change on a control that already existed: anyone
who learned that the graph divider does nothing now finds that it does
something. That is the point of the item, and the title text says which column
moves before the drag starts.

The regression to watch is the ordinary dividers, which must keep sizing their
own column in the ordinary direction — asserted directly.

## Rollback

Revert the commit. One component and one test file; nothing else imports
`resizeTarget`.
