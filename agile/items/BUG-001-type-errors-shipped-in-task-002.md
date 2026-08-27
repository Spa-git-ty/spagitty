<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-001 — TASK-002 shipped with type errors in its own test files

**Status:** Fixed, in FEAT-003's change. See below for why it did not get its
own branch.

## Observed

`npm run check` reports 8 errors across three of the test files TASK-002 added:

```
src/lib/ui/ui.test.ts       6 errors  RefChip's `kind` is a union, and an
                                      object literal typed `string` is not
                                      assignable to it
src/lib/graph/rows.test.ts  1 error   the canvas stub is a 2d context, not
                                      the full overloaded `getContext`
src/lib/repo.test.ts        1 error   (surfaced later by FEAT-003, when
                                      RepoCounts gained a field)
```

## Expected

Zero. `TASK-002-automated.md` records the run result as `npm run check — clean`
and `SWEEP-T002-04` asserts it exits 0.

## Reproduction

At commit `dc2b664`:

```sh
npm ci && npm run check
```

## Environment

Any. It is a static type error, not environment-dependent.

## Cause

The gate was not re-run after the tests were written. `npm run check` was run
at the start of the session — when it covered 332 files and passed — and the
result was recorded from that run. Adding 19 test files took it to 896 files,
and it was never run again before the commit.

The tests themselves pass: `vitest` type-strips rather than type-checks, so
nothing failed at runtime and nothing pointed at the problem.

## Why it is recorded here rather than fixed on its own branch

Two of the three files had to change in FEAT-003 anyway — `RepoCounts` gained a
`staged` field, which forced `repo.test.ts`, `chrome.test.ts` and
`repo-store.svelte.ts` open in the same change. Splitting the remaining two
files into a `bugfix/` branch would have produced a branch that conflicts with
FEAT-003 on files FEAT-003 must edit, for no review benefit.

This is a deviation from Amendment 13's one-item-one-branch rule, recorded
rather than quietly taken.

## What stops it happening again

- `TASK-002-automated.md` is corrected: it no longer claims a clean run it did
  not have.
- The real fix is mechanical: gate 2 in `.github/workflows/gates.yml` runs
  `npm run check` on every push and pull request, and would have failed this
  commit. It has never run, because there is no remote — which is precisely the
  hole this bug fell through.
- Until there is a remote, `npm run check` is run immediately before every
  commit rather than once per session.

## Related

TASK-002, FEAT-003.
