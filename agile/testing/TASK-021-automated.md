<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-021 — Automated tests

**Item:** [`agile/items/TASK-021-centre-the-name-in-the-title-bar.md`](../items/TASK-021-centre-the-name-in-the-title-bar.md)

## What was written

One test, in `src/lib/chrome/chrome.test.ts`, against a mounted `TitleBar`.

| Test | Asserts |
| --- | --- |
| puts the name in the middle of the window, not the middle of the gap | The bar has exactly three children; the middle one is the name and reads `Spagitty`; the leading one is empty and `aria-hidden`. |

## What it can and cannot see

It asserts the **structure the centring depends on** — three children in the
right order, with the layout device marked as one. It cannot assert that the
name is centred: happy-dom does not lay out a grid, so every element it is asked
about is at the origin with no size. A test claiming to check the geometry would
be asserting nothing, which is the failure mode this session has already been
bitten by twice.

The geometry is checked by eye in the sweep, at several window widths, which is
where a centring either reads as centred or does not.

`npm run check` covers the rest: the class the styles hang on and the markup
producing exactly the three children the grid expects.

## Recorded run

```
npx vitest run src/lib/chrome/
 Test Files  2 passed (2)
      Tests  53 passed (53)
```

52 before, 53 after.

## Coverage

Unmoved in any meaningful sense — the change is markup and CSS with no branching
logic. The whole-project figure is recorded with the work that landed alongside.
