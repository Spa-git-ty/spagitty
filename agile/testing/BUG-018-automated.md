<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-018 — Automated tests

**Item:** [`agile/items/BUG-018-a-menu-cannot-be-dismissed.md`](../items/BUG-018-a-menu-cannot-be-dismissed.md)

## The test that already existed, and asserted nothing

The teardown of a portaled pane was covered. The test read:

```ts
handle!.destroy!();
node.remove();          // <- the test cleaning up on the action's behalf
await paint();
expect(document.querySelectorAll('.liquid-glass-stage > *')).toHaveLength(0);
```

The stage was empty at the end because the test emptied it. The line is gone.
With it gone the test fails against the code as it was, which was confirmed
before a line of the fix was written:

```
× takes a portaled pane back off the stage when it is torn down
AssertionError: expected <div class="menu" …(1)></div> to have a length of +0 but got 1
```

That is the regression test Amendment 9 asks for: it fails without the fix, and
it fails for the reason the defect existed.

## What was added

| Test | File | Asserts |
| --- | --- | --- |
| takes a portaled pane back off the stage when it is torn down | `liquidGlass.test.ts` | `destroy()` alone leaves the stage empty. Nothing else is called. |
| leaves a pane that was already outside the lens where it is | `liquidGlass.test.ts` | Existing; now also guards the other side of the fix — a pane the action never moved is not removed by it. |
| closes the branch menu when the control that opened it is clicked again | `chrome.test.ts` | `mousedown` then `click` on the control, the shape a pointer sends. Fails without the `anchor` guard. |
| keeps the branch menu open when something inside it is pressed | `chrome.test.ts` | A mousedown inside the menu is not a dismissal. |
| closes the branch menu on a mousedown anywhere else | `chrome.test.ts` | The ordinary route out still works. |
| closes when the focus lands nowhere | `Menu.test.ts` | `focusout` with a null `relatedTarget` — what clicking a non-focusable part of the application produces. |
| stays open while the focus moves between its own entries | `Menu.test.ts` | Focus inside the menu is not focus leaving it. |
| stays open when the focus lands on the control that opened it | `Menu.test.ts` | Otherwise focusout closes it and the control's click reopens it. |
| leaves a mousedown on its anchor alone | `Menu.test.ts` | The component half of the same guard. |

## The blind spot this exposed, which is not closed

Every component test mounts its menu with no `.lens` in the document. The action
returns at `if (!target) return {}` and **the pane is never portaled**, so every
menu test in the suite exercises an arrangement the running application never
uses.

`liquidGlass.test.ts` builds a shell with a `.lens` and is the only place a
portal happens under test — which is why the teardown test above can exist at
all. Nothing else in this module that only matters when a pane is portaled has
coverage that could fail. That is worth its own item and is not closed here.

## Recorded runs

```
npx vitest run src/lib/ui/ src/lib/chrome/ src/routes
 Test Files  10 passed (10)
      Tests  219 passed (219)
```

```
npm run coverage
 Test Files  75 passed (75)
      Tests  1865 passed (1865)
```

The whole-project figure against the Amendment 10 floor of 70% is recorded with
the run above; `npm run coverage` fails the run itself if the floor is breached,
and it did not.
