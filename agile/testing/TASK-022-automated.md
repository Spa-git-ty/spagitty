<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-022 — Automated tests

**Item:** [`agile/items/TASK-022-the-glass-goes-back-on-the-gpu.md`](../items/TASK-022-the-glass-goes-back-on-the-gpu.md)

## What this change does to the suite

It removes tests rather than adding them, which is worth stating plainly: 41
tests went with the modules they covered. They were good tests — the map
arithmetic, the filter region, the pane registry, the teardown — and they are
intact in `~/claudetrashbin` beside the code they test.

What replaces them is that there is nothing left to get wrong. The frost is two
built-in filter functions in a custom property; there is no geometry, no
registry, no portal and no lifecycle. A `backdrop-filter` cannot be measured in
the wrong units, cannot leave a node on a stage, and has no teardown to forget.

## What is asserted now

The existing component tests for `Menu` and `DialogHost` cover the behaviour
that remains, and they now exercise the arrangement the application actually
runs. That was not true before: every component test mounted its menu with no
`.lens` in the document, so `liquidGlass` returned early and the pane was never
portaled — the suite tested a shape the running application never used, which is
what let BUG-018 through. With no portal, the tested arrangement and the real one
are the same thing.

Nothing importing the retired modules is caught by `npm run check` across the
project, which is the check that would fail.

## What is not covered, and cannot be

That a pane is fast. Frame timing needs a compositor, a real window and a
display; happy-dom has none of them. The numbers in the item were measured at
the window with a profiler on a throwaway branch, and the sweep asks a person to
confirm the result on a repository large enough to make it obvious.

## Recorded run

```
npm run coverage
 Test Files  73 passed (73)
      Tests  1829 passed (1829)
All files    |   85.98 |    74.71 |   82.26 |   85.53 |
             |  % Stmts | % Branch | % Funcs | % Lines
```

1870 tests before, 1829 after: the 41 that left with the modules. Above the
Amendment 10 floor of 70% on every column.
