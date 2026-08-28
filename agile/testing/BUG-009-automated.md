<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-009 — Automated tests

**Item:** [`agile/items/BUG-009-message-column-has-no-handle.md`](../items/BUG-009-message-column-has-no-handle.md)
**File:** `src/lib/graph/columns.test.ts` — 14 tests, all passing.

## Why these read CSS

The test environment mounts components without a stylesheet, so
`getBoundingClientRect` on a divider returns zeros and a geometry assertion here
could not fail. `src/lib/ui/btn.test.ts` set this precedent for BUG-002, which
was also a pure-CSS defect. What is asserted is the rule that caused it.

## Tests

| Asserts |
| --- |
| `.divider.last` declares `right: 0` — **the fix** |
| `.divider` still declares `right: -3px`, so every other divider keeps straddling its boundary |
| The markup carries `class:last={index === shown.length - 1}`, without which the rule can never apply |
| The store still resizes the filling column — `columns.resize('message', 420)` takes effect |
| The store still refuses the computed column — `columns.resize('graph', 999)` does nothing |

The last two come at it from the other side. The store's half was never broken,
and a "fix" that reached into it would be fixing the wrong thing; these fail if
someone later tries.

## Coverage

1041 tests, all four metrics over the floor. This item adds CSS and one class
binding; the store branches it exercises were already covered and are asserted
here for a second reason.

## Not covered here

That a person can actually grab the handle — that the cursor changes and the
drag follows the pointer. That is geometry against a real layout engine.
`BUG-009-T1` in the sweep.
