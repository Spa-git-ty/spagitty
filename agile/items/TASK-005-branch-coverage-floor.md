<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-005 — Branch coverage is below the Amendment 10 floor

**Status:** open, not started
**Branch:** none yet

## Problem

Gate 3 of the Amendment 16 pipeline fails, and has been failing before any of
the recent work. `npm run coverage` on the current tree:

| Metric | Value | Floor |
| --- | --- | --- |
| Statements | 78.87% (4245/5382) | 70% — pass |
| Lines | 78.41% (2910/3711) | 70% — pass |
| Functions | 75.23% (1109/1474) | 70% — pass |
| Branches | **62.66%** (1215/1939) | 70% — **fail** |

```
ERROR: Coverage for branches (62.66%) does not meet global threshold (70%)
```

`vite.config.ts:51` sets all four thresholds to 70, and `.github/workflows/gates.yml`
runs `npm run coverage` as part of gate 3, so this is a red gate — it simply has
not been visible, because the repository has no Actions runs (`gh run list`
returns 404) and every commit so far has gone straight to `main` without a pull
request to display a gate result on.

## Where the shortfall is

Concentrated almost entirely in `src/lib/ui/`, the shared component layer:

| File | Statements | Branches |
| --- | --- | --- |
| `Dialog.svelte` | 0% | 0% |
| `Menu.svelte` | 0% | 0% |
| `Notice.svelte` | 0% | 0% |
| `menu.ts` | 0% | 100% |
| `dialog.svelte.ts` | 12.12% | 0% |
| `notice.svelte.ts` | 19.23% | 0% |
| `Splitter.svelte` | 94.23% | 85.29% |
| **`lib/ui` overall** | **33.77%** | **30%** |

Everything else in the frontend is at or above the floor. This is one untested
module dragging a whole-project metric under the line, not a diffuse problem.

That module is also exactly the kind Amendment 10 says to prioritise: dialogs
and menus are state machines with keyboard handling, focus trapping, dismissal
paths and escape hatches — branches that can be wrong — and the notice store is
queueing and expiry logic.

## Scope

- Tests for `dialog.svelte.ts` and `notice.svelte.ts`: open/close, stacking,
  dismissal, expiry, the error paths.
- Tests for `Menu.svelte`, `Dialog.svelte`, `Notice.svelte`: keyboard navigation,
  Escape, click-outside, focus return, and rendering of each variant.
- Whatever else is needed to bring branch coverage over 70% first-party.

## Non-scope

- Lowering the threshold in `vite.config.ts`. The floor is Amendment 10's, and
  moving the goalposts to make a gate green is exactly what Amendment 16 forbids.
- Rust coverage, which is not currently measured at all — worth its own item.
- Padding coverage with tests that execute code without asserting on it.
  Amendment 10 calls that padding, and it is not written here.

## Acceptance criteria

- `npm run coverage` exits clean with all four metrics at or above 70%.
- The new tests assert behaviour, not execution: each one fails if the component
  it covers is broken.
- `lib/ui`'s own branch coverage is the part that moves; no other module's
  numbers are massaged to compensate.

## Dependencies

None. Discovered while fixing BUG-005 and split out of it deliberately, so a
bugfix branch does not carry a test-writing project.
