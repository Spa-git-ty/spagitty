<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-007 — Plan

**Item:** [`agile/items/BUG-007-replaced-dialog-resolves-wrong-value.md`](../items/BUG-007-replaced-dialog-resolves-wrong-value.md)
**Branch:** `bugfix/BUG-007-replaced-dialog-cancel-value`
**Status:** implemented.

## Approach

`ask()` settled the outgoing question with the **incoming** question's cancel
value. The fix is to settle it with its own.

The root cause is not the line that got it wrong, it is that a question's cancel
value had **two definitions** — one inlined in `dismiss()`, one passed as a
parameter into `ask()`. A replaced question and a dismissed one are the same
event from the caller's side, so they must not be able to disagree about it, and
two definitions is exactly what let them.

So the fix is a single `cancelValue(question)` used by both paths. The
`answerIfReplaced` parameter then has nothing left to say and goes with it — the
change removes a parameter rather than adding a branch.

### Alternative rejected

Making `ask()` take the correct value at each call site. It fixes today's bug and
leaves tomorrow's: two callers still each state the rule, and the next entry
point added to the store states it a third time.

## Files

| File | Change |
| --- | --- |
| `src/lib/ui/dialog.svelte.ts` | `cancelValue()`; `ask()` uses it and loses its second parameter; `dismiss()` uses it |
| `src/lib/ui/Dialog.test.ts` | two loose assertions tightened, two tests added |

## Testing

Two assertions written by TASK-005 checked only settlement and falsiness, with a
comment pointing at this item; they now pin the exact value in both directions.
Two more are added: one covering replace-with-the-same-kind, and one asserting
the answer against **the callers' actual guard shape** — `=== null`, and not a
boolean — since that is where the defect bit rather than in the store.

Verified to fail without the fix (Amendment 9). Restoring the old behaviour:

```
× answers a replaced prompt with null
× answers a replaced question the same way whichever kind replaces it
× resolves a replaced prompt to something its callers' null guard catches
  Tests  3 failed | 21 passed (24)
```

## Risk

Low, and one-directional. The values a caller can now receive are a strict subset
of what it could receive before: a confirmation still gets `false`, a prompt now
gets `null` where it could previously get `false`. Nothing that worked can break;
the code paths that were unreachable-by-luck become unreachable-by-design.

## Rollback

Revert the branch. One function, one helper, no state.
