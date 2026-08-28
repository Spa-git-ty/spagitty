<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-020 — Plan

**Item:** [`agile/items/TASK-020-the-glass-material-settled.md`](../items/TASK-020-the-glass-material-settled.md)

## Approach

Six numbers cannot be chosen by argument, so they were chosen by eye.

A temporary Settings section with one slider per value, bound live: the material
values pushed into `DEFAULTS` in place so the next pane opened used them, and the
corner written straight onto the document so every panel took it. A sample pane
carried the live values through the glass action, so the action's own `update`
fired on each drag and the preview refracted immediately rather than needing a
menu opened to see a change.

The sample sat **over text** deliberately. Frost judged only against a flat panel
tells you nothing about whether a real menu stays readable over a commit list.

Values persisted to `localStorage` across reloads, and the exact set was printed
at the foot of the panel to be read back verbatim — the numbers had to survive
the trip from the window to the source without being retyped from memory.

## Files

- `src/lib/ui/liquidGlassMaps.ts` — `DEFAULTS`.
- `src/app.css` — `--r-panel`.
- `src/lib/metrics.ts` — `RADII`, the copy of the same token.

## Risks

**The two copies of `--r-panel`.** `metrics.ts` duplicates the stylesheet's
radius tokens because the first paint uses the stylesheet before any script
runs, and `metrics.test.ts` reads the stylesheet rather than trusting the two to
agree. Moving one without the other fails that test, which is the point of it.

**`saturate: 0` reads as a mistake.** The note beside the frost tokens warns
that a pane which only blurs looks like grey plastic. The value was chosen at
the window with the alternative visible, so the comment says so where the number
lives, rather than leaving a future reader to correct it.

## Rollback

Six numbers in two files. The previous values are in the history.
