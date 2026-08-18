<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-007 — Automated tests

**Item:** [`agile/items/BUG-007-replaced-dialog-resolves-wrong-value.md`](../items/BUG-007-replaced-dialog-resolves-wrong-value.md)
**File:** `src/lib/ui/Dialog.test.ts` — 24 tests, all passing.

## Tightened

| Test | Was | Now |
| --- | --- | --- |
| `answers a replaced confirmation with false` | `toBeFalsy()` | `toBe(false)` |
| `answers a replaced prompt with null` | `toBeFalsy()` | `toBeNull()` |

Both were written by TASK-005 with a comment naming this item, deliberately loose
because the behaviour they described was the defect.

## Added

| Test | Asserts |
| --- | --- |
| `answers a replaced question the same way whichever kind replaces it` | prompt-replaced-by-prompt resolves `null`; confirm-replaced-by-confirm resolves `false`. The fix must not depend on the kinds differing |
| `resolves a replaced prompt to something its callers' null guard catches` | `answer === null` is `true`, and the answer is neither a boolean nor a string — written as the exact shape of the guard at `graph/actions.ts:84`, `:99` and `:302`, because that is where the defect bit |

## Regression proof

Amendment 9 requires a test that fails without the fix. Restoring the old
behaviour — settling the outgoing question with the incoming `false`:

```
× answers a replaced prompt with null
× answers a replaced question the same way whichever kind replaces it
× resolves a replaced prompt to something its callers' null guard catches

  Tests  3 failed | 21 passed (24)
```

Three fail, not one, because the defect is asserted from three angles: the value,
the symmetry, and the caller's guard.

## Coverage

`dialog.svelte.ts` remains at 100% statements. The change removes a parameter and
adds a two-line helper; both branches of `cancelValue` are exercised by the
existing prompt and confirmation tests as well as the new ones.

## Not covered here

Triggering the replacement through the real UI — opening a prompt and reaching a
confirmation from the command palette while it is up. That is `BUG-007-T1` in the
sweep.
