<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-024 — Automated tests

**Item:** [`agile/items/TASK-024-the-glass-reads-as-glass.md`](../items/TASK-024-the-glass-reads-as-glass.md)

## What was tested

`src/lib/ui/glass.test.ts` — seven tests. They read `src/app.css` and the
components rather than a rendered pane, for the reason `btn.test.ts` already
records: the test environment mounts components without applying any CSS, so a
`getComputedStyle` assertion here would pass whatever the rules say.

| Test | Asserts | Guards |
| --- | --- | --- |
| does not drain the colour out of what is behind it | `--blur-thick` does not contain `saturate(0)` | The defect itself |
| pulls the colour behind it forward | its saturation is above 100% | The defect itself |
| keeps the blur radius TASK-022 measured | the radius is exactly `blur(10px)` | The frame budget |
| leaves enough of the backdrop visible | `--glass-thick` is under 80% in both themes | The defect itself |
| gives every floating pane an edge | every component using `--blur-thick` declares a `--glass-edge` border | The defect, and any sixth pane added later |
| draws that edge as a border, not the shadow TASK-023 removed | all six rim and sheen declarations are still `none` | TASK-023's decision |
| the stylesheet is brace-balanced | depth never goes negative and ends at zero | The stray brace |

Two of the seven — the radius and the rim tokens — passed before this change
and pass after it. They are guards rather than claims: they say what must not
move, and both name a decision somebody else made deliberately.

The pane test finds its subjects by scanning `src/lib` and `src/routes` rather
than listing five paths, so a pane added later is covered without anybody
remembering to add it. It asserts the list is at least five long first, because
a scan that silently finds nothing is a test that passes over an empty set.

## Run against the unfixed code first

Every new test here was run against `origin/dev` before the fix was written:

```
git checkout origin/dev -- src/app.css src/lib/ui/Menu.svelte ...
npx vitest run src/lib/ui/glass.test.ts

 × does not drain the colour out of what is behind it
   AssertionError: expected 'blur(10px) saturate(0)' not to match /saturate\(\s*0\s*\)/
 × pulls the colour behind it forward rather than leaving it as it is
   AssertionError: --blur-thick declares no saturation: expected null not to be null
 × leaves enough of the backdrop visible to be frosted
   AssertionError: --glass-thick hides the backdrop under :root {: expected 82 to be less than 80
 × gives every floating pane an edge
   AssertionError: src/lib/commandlog/CommandLog.svelte floats with no edge to catch the light
 × is brace-balanced
   AssertionError: unbalanced closing brace at src/app.css:440: expected -1 to be >= 0

 Tests  5 failed | 2 passed (7)
```

Five failures, each naming its own defect, and the two guards passing exactly
as they should. The files were restored from `HEAD` immediately afterwards.

## What these tests cannot say

**Whether the pane now looks like glass.** That is the whole point of the task
and no assertion here touches it: these tests prove the material is declared
the way the item says, not that the result reads as a material to a person
looking at it. Amendment 4 keeps verification headless and the wheel has not
been handed over, so the judgement belongs to the sweep — `SWEEP-001` and
`SWEEP-002` are the tickets that actually close this item.

**Whether it still runs at 60fps.** Also the sweep, `SWEEP-005`. The argument
that it must — an unchanged blur radius, and saturation being a matrix rather
than a kernel — is an argument, and TASK-022 is the record of what happens when
this material's cost is reasoned about instead of measured.

## Recorded run

```
npx vitest run src/lib/ui/glass.test.ts
 Test Files  1 passed (1)
      Tests  7 passed (7)

npm run check
COMPLETED 1036 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS

npm run test
 Test Files  74 passed (74)
      Tests  1857 passed (1857)
```

## Coverage

`src/lib/ui/glass.test.ts` is a test file and is excluded from the denominator
by `vite.config.ts`. The change is CSS, which coverage does not instrument, so
the figure moves only with the suite around it and stays above the Amendment 10
floor of 70%:

```
npm run coverage

All files | % Stmts 85.99 | % Branch 74.71 | % Funcs 82.27 | % Lines 85.54
```
