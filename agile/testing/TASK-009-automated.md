<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-009 — Automated tests

**Item:** [`agile/items/TASK-009-drop-the-work-item-ids.md`](../items/TASK-009-drop-the-work-item-ids.md)
**Run:** `npx vitest run` — 1041 tests, 55 files, all passing.

## Rewritten, not added

Three tests asserted the work item identifiers were on screen. They were correct
when written — showing them was the intended behaviour — and each is now
inverted:

| File | Test | Now asserts |
| --- | --- | --- |
| `requests.test.ts` | `disables every action and says what it needs, without naming a work item` | Every action button is disabled and its title contains "connected account", and `not.toMatch(/FEAT-\d/)` |
| `sections.test.ts` | `says a toggle is not honoured yet, without naming a work item` | The toggle still says "Persisted, not yet honoured" and "rewrites history", and no identifier |
| `sections.test.ts` | `says no account is connected, and what connecting one takes` | "No account is connected" and "ssh key", and no identifier |

**Each keeps a positive assertion beside the negative one.** A test that only
checked for the absence of `FEAT-` would pass on a button with no title at all,
which is a worse interface than the one being fixed.

## Not covered here

That the removed passages are gone from the *rendered* screens. The suite does
not mount route components, and grepping the source for an absent string is a
test that passes for the wrong reason. `TASK-009-T1` and `T2` in the sweep.

## Coverage

1041 tests, all four metrics over the Amendment 10 floor — statements 87.18%,
branches 72.67%, functions 84.48%, lines 86.43%. This item removes text and adds
no first-party branches.
