<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-014 — Plan

**Item:** [`agile/items/FEAT-014-stash-pop-apply-drop.md`](../items/FEAT-014-stash-pop-apply-drop.md)
**Branch:** `feature/FEAT-014-stash-pop-apply-drop`
**Status:** implemented.

## Approach

The item was written as though this were a subsystem. It was not: the entire
backend and the confirmation existed and, since TASK-005, were covered by tests.
Step one was correcting that document (Amendment 11) — the plan for a feature
that is already three-quarters built is a different plan.

What was genuinely missing:

1. Three `onclick` handlers.
2. The thing `actions.ts` cannot know about — the Stash screen holds its own copy
   of the list, and `perform()`'s refresh reaches the graph and the rail but not
   here.

### Where the confirmation stays, and why

In `graph/actions.ts`, untouched. That module's opening argument is that the
sentence shown before a destructive operation is as much a part of the operation
as the command, and that burying it in a component means the next screen offering
the same operation writes a different sentence. The Stash screen is precisely
that second screen. Moving the wording into `StashDetail.svelte` would have
proved the argument right the hard way.

### `stash.restore(action)`

Mirrors `push()`, which already had this exact shape — write, then re-read the
list and the rail. It adds two things `push()` does not need:

- **A `busy` guard.** Two clicks on Drop must not drop two entries.
- **Releasing the selection for pop and drop but not apply.** Pop and drop remove
  the entry, so a selection left pointing at it would survive into the re-read
  as a reference to something gone.

### `perform()` answers whether anything changed

`actions.stash` previously returned `void`, so a caller could not tell a
cancelled confirmation from a completed write. `perform()` now answers `boolean`
and `stash` passes it up, so the screen re-reads exactly when there is something
new to read rather than after every dismissed dialog.

Every other action in the module `await`s `perform` without returning it and is
unchanged — one signature moved, not seventeen.

## Files

| File | Change |
| --- | --- |
| `src/lib/stash/StashDetail.svelte` | three chips wired; `PENDING` map and the send-them-to-a-terminal line removed; dead `.actions p` rule removed |
| `src/lib/stash/store.svelte.ts` | `restore(action)` |
| `src/lib/graph/actions.ts` | `perform` and `stash` answer `boolean` |
| `src/lib/stash/panes.test.ts` | the stale "not built yet" test rewritten; a dispatch test added |
| `src/lib/stash/store.test.ts` | seven tests for `restore` |
| `agile/items/FEAT-014-*.md`, `docs/screens.md` | corrected |

## Risk

**A dropped stash is the one genuinely unrecoverable action here**, which is why
the confirmation was always the important half and why it is reused rather than
rewritten. The `busy` guard exists because the failure mode of a double click is
losing a second entry that was never named in any confirmation.

**Not fixed, and said so:** the conflicted-apply path. `git stash pop` onto a
conflict leaves the entry in place *and* the working copy conflicted. Today that
surfaces as git's own message in a notice — honest, but not the designed recovery
this item's own notes asked for. It needs a conflict write path, so it belongs
with FEAT-016 rather than being half-built here. Recorded in the item and in
`docs/screens.md`.

## Rollback

Revert the branch. `perform`'s return value is additive; nothing depends on it
but `stash`.

## Verification

```
npx vitest run --coverage   # 1021 tests; branches 72.2%
npm run check               # 991 files, 0 errors
```
