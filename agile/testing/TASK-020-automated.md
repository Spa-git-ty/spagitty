<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-020 — Automated tests

**Item:** [`agile/items/TASK-020-the-glass-material-settled.md`](../items/TASK-020-the-glass-material-settled.md)

## What was written

None, and the reason is the point: the change is six constants chosen by eye.
There is no behaviour here to assert. A test that reads `DEFAULTS.blur` back and
compares it to `10` restates the source in a second file and fails the moment
the author looks at the window again — it is padding, which Amendment 10
explicitly does not want written.

## What the existing tests do carry

Two guards that matter, both already in place and both exercised by the change:

| Test | File | Asserts |
| --- | --- | --- |
| the radius tokens agree with the stylesheet | `src/lib/metrics.test.ts` | `RADII` in `metrics.ts` matches the `--r-*` declarations in `app.css`, read from the stylesheet rather than restated. Moving `--r-panel` in one file and not the other fails here, which it did until both moved. |
| the material reaches the filter | `src/lib/ui/liquidGlassMaps.test.ts` | `DEFAULTS.blur` and `saturate` reach the emitted primitives, so a value that is set but not plumbed is caught. |

The second of those has since moved to `~/claudetrashbin` with the module it
covered, when the lens was retired.

## Recorded run

```
npx vitest run src/lib/metrics.test.ts src/lib/ui/liquidGlassMaps.test.ts
      Tests  76 passed (76)
```

```
npm run check
COMPLETED 1039 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS
```

## Coverage

Unmoved: the change adds no statements and no branches. The whole-project figure
against the Amendment 10 floor is recorded with the later work that touched the
same area.
