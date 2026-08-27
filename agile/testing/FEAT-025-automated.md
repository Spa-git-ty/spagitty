<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-025 — Automated tests

## Run result

```
npm test        806 passed, 0 failed   (48 files)
npm run check   982 files, 0 errors, 0 warnings
cargo test      272 passed, 0 failed   (untouched)
```

Nine tests in the new `src/lib/graph/columns.test.ts`, which had no test file of
its own before — the store was covered only through the components that use it.

## The tests

| Group | Asserts |
| --- | --- |
| The filling column | Fills by default; a drag gives it a width and stops it filling; it cannot go below the 160px a message needs; clearing the width fills again |
| The total width | Null while anything fills — the table is exactly its viewport — and the sum once nothing does, growing when a column is added |
| The graph column | Still refuses to be dragged, because its width is the lanes on screen |
| Resetting | Order, widths and the fill all come back |

## Coverage

`columns.svelte.ts` moves from being covered incidentally to being covered
directly. The frontend totals are unchanged in shape; the standing branch-coverage
gap from FEAT-022 is untouched.

## What is not covered by automation

- The drag itself. `startResize` measures the header cell with
  `getBoundingClientRect`, which returns zeroes in happy-dom, so the gesture is
  a sweep ticket rather than a unit test.
- That the header, the rows and the lane layer scroll by exactly the same
  amount. The expression is one number passed to three consumers; whether it
  *looks* aligned mid-scroll is SWEEP-025-04.
