<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-014 — Automated tests

**Item:** [`agile/items/FEAT-014-stash-pop-apply-drop.md`](../items/FEAT-014-stash-pop-apply-drop.md)
**Run:** `npx vitest run --coverage` — 1021 tests, 55 files, all passing.

## Coverage

| Metric | Value | Floor |
| --- | --- | --- |
| Statements | 86.97% | 70% — pass |
| Branches | 72.2% | 70% — pass |
| Functions | 84.33% | 70% — pass |
| Lines | 86.22% | 70% — pass |

## `src/lib/stash/store.test.ts` — `restore`, 7 tests

The confirmation and the write are `graph/actions.ts`'s and are tested there
(TASK-005, 53 tests including all three stash actions). What is asserted here is
this store's own share.

| Asserts |
| --- |
| The selected entry's `index` and `name` reach the action, with the right `StashAction` |
| On success the list **and** the rail are re-read |
| When the action reports it did nothing — a cancelled confirmation — **neither** is re-read |
| Pop and drop release the selection; apply keeps the entry open |
| With nothing selected, the action is never called |
| A second restore while one is in flight is refused — two clicks on Drop must not drop two entries |
| `busy` is cleared even when the action throws |

The last two are the ones worth having. A double-click losing an entry that was
never named in a confirmation is the failure mode this feature could actually
cause harm with.

## `src/lib/stash/panes.test.ts` — 2 tests

| Test | Asserts |
| --- | --- |
| `offers pop, apply and drop as real controls` | The three chips are `BUTTON`, carry no "Not built yet" title, and the screen no longer contains `git stash pop` or `Not built yet` anywhere |
| `asks the store to restore, with the action the chip stands for` | Clicking the three chips in order calls `stash.restore` with `pop`, `apply`, `drop` — so the labels and the actions cannot be wired up crossed |

## Rewritten, not deleted

`says what pop, apply and drop would do rather than hiding them` asserted the old
behaviour: inert `SPAN`s, `Not built yet` titles, and a line telling the reader to
run `git stash pop` in a terminal. It is replaced by
`offers pop, apply and drop as real controls`, which asserts the inverse
explicitly — `not.toContain('Not built yet')` — so the old copy cannot return
unnoticed.

## Not covered here

- **A real pop, apply or drop against a repository.** These are frontend tests;
  the Rust path has its own. `FEAT-014-T1` to `T4` in the sweep.
- **The conflicted-apply path**, which is not implemented — see the item. The
  sweep records it as a known state rather than a test that should pass.
