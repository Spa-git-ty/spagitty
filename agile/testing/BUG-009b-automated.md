<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-009b — Automated tests

**Item:** [`agile/items/BUG-009b-graph-divider-resizes-message.md`](../items/BUG-009b-graph-divider-resizes-message.md)
**File:** `src/lib/graph/columns.test.ts` — the
`BUG-009b — a computed divider sizes the column after it` block, 5 tests.

## Why these read the component source

The suite mounts components into happy-dom with no stylesheet, and a pointer
drag against a layout where every box measures zero would pass whatever the
handler did. `src/lib/ui/btn.test.ts` set this precedent for BUG-002 and
BUG-009's tests followed it. What is asserted here is the decision that produces
the behaviour, not a simulated gesture.

## Tests

| Asserts |
| --- |
| A non-computed column's divider sizes itself; a computed one's sizes the next column — **the fix** |
| The drag is inverted for that case, so the boundary follows the pointer |
| The start width is measured from `nextElementSibling`, not from the handle's own cell |
| A divider with no target is still `class:fixed` |
| The title names the column that will actually be sized |

## Coverage

1041 tests, 55 files, all passing at the time of the change; all four metrics
over the Amendment 10 floor. The change is confined to one component, and
`columns.svelte.ts` — the part with branches worth counting — is untouched.

## Not covered here

- That the drag feels right: that the boundary tracks the pointer pixel for
  pixel and the message column does not jump on the first move. Geometry against
  a real layout engine — `BUG-009b-T1` in the sweep.
- That the graph column's own width still follows the lanes while its divider is
  being dragged for something else — `BUG-009b-T3`.
