<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-003 — Automated tests

## Run result

```
npm test        793 passed, 0 failed   (46 files)
npm run check   981 files, 0 errors, 0 warnings
cargo test      272 passed, 0 failed   (untouched)
```

Four new tests in `src/lib/graph/rows.test.ts`, all of which fail against the
pre-fix component because it renders no layer at all.

## The tests

| Test | Asserts |
| --- | --- |
| `puts the canvas after exactly the columns that precede the graph` | With the default order the layer is spacer, canvas slot, filling gap — in that order, with the spacer at the Branch/Tag column's own width |
| `follows the Branch/Tag column when it is resized` | After `columns.resize('refs', 120)` the spacer is 120px and specifically not the 186px constant that caused the bug |
| `has nothing in front of it when the graph is the first column` | Reordering puts the canvas slot at index 0 |
| `clips the canvas to its own column` | The slot is the lane column's width and declares `overflow: hidden`, so a wrongly sized canvas is cut off rather than painting over a neighbour |

The clipping assertion reads the component's stylesheet rather than a computed
style, for the reason recorded in `BUG-002-automated.md`: the test environment
mounts components without applying CSS, so a computed check would pass either
way.

## Coverage

`CommitRows.svelte` is unchanged in coverage terms — the layer is markup. The
frontend totals are unmoved by this fix, and the standing branch-coverage gap
from FEAT-022 is unaffected.

## What is not covered by automation

Whether the lanes *look* aligned with the nodes' own rows at every zoom level,
which is SWEEP-003-04. The tests assert the element is in the right slot; a
half-pixel error inside the canvas is a different question and belongs to the
sweep.
