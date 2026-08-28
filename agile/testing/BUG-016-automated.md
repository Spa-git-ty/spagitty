<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-016 — Automated tests

**Item:** [`agile/items/BUG-016-graph-columns-stop-at-the-last-row.md`](../items/BUG-016-graph-columns-stop-at-the-last-row.md)

## What was written

All six sit in `src/lib/graph/rows.test.ts`, in a `the column bed` block, at the
component layer: `CommitRows` is mounted against the graph store double in
`src/testing/graph-store.svelte.ts` and the bed is read out of the real DOM.
That is the layer the defect lives at — the fault was not in any function's
return value, it was in which element carried the paint.

| Test | Asserts |
| --- | --- |
| gives every shown column a slot, in the same order as a row | One bed slot per `columns.shown` entry; the first sized like the row's first cell, the graph slot carrying the band, the message slot filling. |
| paints the band with the class the row graph cell also wears | `.lane-space` and the bed's graph slot both carry `.lane-band`, so the two halves of the band cannot be declared differently. |
| follows a column being resized, exactly as the rows do | After `columns.resize('refs', 120)` the bed's first slot is 120px. |
| follows a reorder, so the band never lands on the wrong column | After `columns.reorder(1, 0)` the band is the bed's first slot. |
| is there when the repository has no commits at all | With zero rows the bed still has a slot per column, and there is no `.lane-space` anywhere — the empty case is the whole point. |
| is sized by the scroller rather than by the rows | The bed is a child of `.rows` and inside neither `.sizer` nor `.scroller`, so it cannot inherit the `count x pitch` height and stop at the last commit by another route. |

Each fails against the code before the fix: five because `.bed` does not exist,
and the class test because `.lane-band` does not exist either.

## What else the change touched

`columns.reset()` now runs in the file's shared `beforeEach`. The column store
is a module singleton and the file never reset it, so a width or an order set by
one test was still set in the next; the three existing lane-canvas tests passed
only because they happened to be the first to touch it. Adding the bed's tests
above them made that visible immediately. This is test isolation, not a change
in behaviour.

## Recorded run

```
npx vitest run src/lib/graph/
 Test Files  9 passed (9)
      Tests  250 passed (250)
```

244 before the change, 250 after: the six above.

## Coverage

`src/lib/graph/CommitRows.svelte` is exercised by 39 tests in `rows.test.ts` and
by `columns.test.ts`. The change adds markup and CSS rather than branching
logic, so it moves the first-party figure very little.

The whole-project figure against the Amendment 10 floor of 70%, measured on this
branch with the bed and its tests in place:

```
npm run coverage
 Test Files  75 passed (75)
      Tests  1848 passed (1848)
All files    |   86.02 |    74.60 |   82.23 |   85.72 |
             |  % Stmts | % Branch | % Funcs | % Lines
```

Comfortably above the floor on every column, branches included, which is the one
that runs closest to it.
