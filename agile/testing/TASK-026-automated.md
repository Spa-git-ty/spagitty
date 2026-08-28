<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-026 — Automated tests

**Item:** [`agile/items/TASK-026-remove-every-remaining-shadow.md`](../items/TASK-026-remove-every-remaining-shadow.md)

## What was tested

`src/lib/ui/flat.test.ts` — three tests, reading the stylesheets rather than a
rendered element, for the reason `btn.test.ts` records: the test environment
mounts components without applying CSS, so `getComputedStyle` would pass
whatever the rules say.

| Test | Asserts |
| --- | --- |
| has no box-shadow anywhere with a blur radius | Every `box-shadow` value in `src/app.css`, `src/lib/**` and `src/routes/**` is parsed layer by layer, function calls stripped first so a `color-mix(… 8%, …)` cannot be mistaken for a length. Any layer with a non-zero third length fails, and the failure names the file, the line, the blur and the value. |
| keeps every shadow token switched off, in both themes | All twelve-plus declarations of `--shadow-1/2/3`, `--sheen`, `--glass-rim`, `--glass-rim-thick`, `--glass-sheen` are `none` — every declaration, not the first one found, which is precisely how TASK-023's light-only fix passed for two tasks. It also asserts it found at least twelve, so it cannot pass over an incomplete set. |
| still draws the lines that are not shadows | The focus ring, the graph's lane-band rules and the focused row's accent bar are all still there. This is the half of the rule that stops "remove all shadows" being read as "remove every `box-shadow`". |

## Run against the unfixed code first

The ten changed sources were checked out from `origin/dev` with the test kept,
and all three tests failed. The first listed all fourteen soft shadows:

```
 × has no box-shadow anywhere with a blur radius
 × keeps every shadow token switched off, in both themes
 × still draws the lines that are not shadows

src/lib/chrome/NavRail.svelte:194      blur 6px
src/lib/chrome/NavRail.svelte:199      blur 8px
src/lib/chrome/RepoTabs.svelte:250     blur 3px
src/lib/chrome/Toolbar.svelte:383      blur 3px
src/lib/commandlog/CommandLog.svelte:121  blur 6px
src/lib/commandlog/CommandLog.svelte:121  blur 32px
src/lib/graph/CommitDetail.svelte:202  blur 3px
src/lib/graph/CommitRows.svelte:991    blur 12px
src/lib/graph/CommitRows.svelte:1096   blur 2px
src/lib/graph/GraphHeader.svelte:252   blur 3px
src/lib/ui/Btn.svelte:143              blur 3px
src/lib/ui/Btn.svelte:163              blur 2px
src/lib/ui/Btn.svelte:163              blur 12px
src/lib/ui/Splitter.svelte:170         blur 6px
```

That list is the item's claim, produced by the test rather than by reading.

## What these tests cannot say

**Whether the dark theme still reads as layered.** Its palette was designed
around shadow density — the note this change corrects says so in as many words —
and whether surfaces and borders alone carry the separation is a judgement at
the window. Amendment 4 keeps verification headless; `SWEEP-002` is the ticket
that closes this item.

## Recorded run

```
npx vitest run src/lib/ui/flat.test.ts
 Test Files  1 passed (1)
      Tests  3 passed (3)

npm run check
 COMPLETED 1036 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS

npm run test
 Test Files  74 passed (74)
      Tests  1849 passed (1849)
```

## Coverage

The change is CSS, which coverage does not instrument, and the new file is a
test and therefore outside the denominator. The figure moves only with the
suite around it and stays above the Amendment 10 floor of 70%.
