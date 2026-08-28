<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-005 — Plan

**Item:** [`agile/items/TASK-005-branch-coverage-floor.md`](../items/TASK-005-branch-coverage-floor.md)
**Branch:** `task/TASK-005-branch-coverage-floor`
**Status:** implemented; gate 3 green.

## Approach

The item's own analysis holds: the shortfall was concentrated in `src/lib/ui/`,
one untested module dragging a whole-project metric under the line. That module
is written first, and then whatever else is still needed — no thresholds are
moved, and no test is written that executes code without asserting on it.

Work went in four steps, each measured before the next was chosen, so that the
cheapest honest coverage was taken first rather than a file being picked because
it looked easy.

| Step | Target | Branch coverage after |
| --- | --- | --- |
| — | baseline | 62.66% |
| 1 | `dialog.svelte.ts` + `Dialog.svelte` | — |
| 2 | `notice.svelte.ts` + `Notice.svelte` | — |
| 3 | `Menu.svelte` + `menu.ts` | 66.83% |
| 4 | `graph/actions.ts` | 69.41% |
| 5 | `scale.svelte.ts` | 69.77% |
| 6 | `palette/Palette.svelte` | **71.89%** |

### Why these files, in this order

`lib/ui` first because the item identified it and because Amendment 10 names
exactly this kind of code as the priority: dialogs and menus are state machines
with keyboard handling, dismissal paths and escape hatches — branches that can
be wrong.

`graph/actions.ts` next, at 0% branch coverage across 386 lines, was the largest
single gap left. It is also the highest-consequence one: every destructive git
operation in the graph routes through it, and the branches that matter are the
*refusals* — a cancelled confirmation that still reaches `api`, or a failed
operation that refreshes as though it had worked, both destroy work silently.

`scale.svelte.ts` and `Palette.svelte` closed the remaining gap. Both are real
logic — clamping and step-snapping arithmetic, and the palette's match
highlighting and blocked-command reasoning — not padding.

### Structure

Store and component are tested in one file where the component holds no state of
its own (`Dialog.test.ts`, `Notice.test.ts`). A component test that mocked its
own store would assert nothing about what a user gets. It also avoids a
`dialog.test.ts` / `Dialog.test.ts` pair, which collides on a case-insensitive
filesystem — and macOS is a build target.

Everything uses the existing harness in `src/testing/mount.ts` (`render`,
`click`, `press`, `fire`, `textSnippet`), which sits outside `src/lib` on purpose
so it is not counted as first-party code.

## Files

**New**

- `src/lib/ui/Dialog.test.ts` — 22 tests, `dialog.svelte.ts` and `Dialog.svelte`
- `src/lib/ui/Notice.test.ts` — 15 tests, `notice.svelte.ts` and `Notice.svelte`
- `src/lib/ui/Menu.test.ts` — 23 tests, `Menu.svelte` and `menu.ts`
- `src/lib/graph/actions.test.ts` — 53 tests
- `src/lib/scale.test.ts` — 21 tests
- `src/lib/palette/Palette.test.ts` — 22 tests

**Unchanged, deliberately:** `vite.config.ts`. Lowering the thresholds is the
item's own declared non-scope and is what Amendment 16 forbids — a gate is made
green by meeting it, not by moving it.

No production code was modified. This is a test-only change.

## What the tests found

Two defects, both raised rather than absorbed (Amendment 13: an unrelated
problem discovered along the way becomes its own item, not a passenger).

1. **BUG-007 — `dialog.svelte.ts:48` settles the wrong caller's contract.**
   `ask(next, answerIfReplaced)` resolves the *outgoing* question with the
   *incoming* question's cancel value. A `prompt()` replaced by a `confirm()`
   therefore resolves `false`, not `null` — and every caller guards with
   `if (name === null) return`, which `false` walks straight past.
   `Dialog.test.ts` asserts settlement and falsiness rather than the exact value,
   with a comment pointing here; those assertions tighten to `toBeNull()` when
   BUG-007 is fixed.

2. **Minor, recorded not fixed:** `Menu.svelte`'s `step(-1)` from an unset
   cursor lands on `entries.length - 2` rather than the last entry, because
   `entries[-1]` is `undefined` and `findIndex` returns `-1`. ArrowDown from
   nothing is correct. Not filed separately; it belongs with BUG-007's area.

## Risks and rollback

**Risk: none to production behaviour.** No source file changed. The worst case
is a flaky test, and the one place timing could bite — `Menu.svelte`'s placement
effect, which measures after mount — uses `vi.waitFor` rather than a fixed number
of microtask turns.

**Risk: happy-dom fidelity.** `getBoundingClientRect()` returns zeros there, so
the placement test asserts the *clamping decision* (the menu is pulled inside the
window) rather than exact pixels. Stated in the test rather than left implicit.

**Rollback:** revert the branch. No production code depends on any of it.

## Verification

```
npx vitest run --coverage   # 980 tests, 55 files, all four metrics ≥ 70%
npm run check               # 991 files, 0 errors, 0 warnings
```
