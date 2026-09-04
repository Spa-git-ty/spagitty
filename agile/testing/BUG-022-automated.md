<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-022 — Automated test record

**Item:** [`agile/items/BUG-022-the-farm-subscribes-after-it-asks.md`](../items/BUG-022-the-farm-subscribes-after-it-asks.md)

## What was written

`src/lib/farm/store.test.ts` —
`is already listening while the backend is still answering`.

It asserts the property rather than the order of two lines: the `api.open` mock
records whether a subscription existed *at the moment it was called*, which is
the only moment that matters, and would still hold if `open()` were rewritten
around a different mechanism.

## It fails without the fix

Confirmed by swapping the two statements back:

```
AssertionError: the backend was asked to do work before anyone was listening
for the answer: expected false to be true
```

## Test command and output

```
$ bun run test
Test Files  109 passed (109)
     Tests  2417 passed (2417)

$ bun run check
COMPLETED 1122 FILES 0 ERRORS 0 WARNINGS
```

## Verified in the running application

This one was found by watching, not by reading, and it was confirmed the same
way — the reason the item can state what the backend did rather than guessing:

1. A scratch test in the crate ran `AgentRegistry::detect_all` on this machine:
   all three installed agents `Available`, in 350ms.
2. Temporary `eprintln!`s in the detection thread showed it running inside the
   application and emitting its event successfully (`sent -> true`).
3. A temporary counter rendered into the Farm header showed the webview's side:
   `a=3 u=0 ev=4` — three agent rows, none of them usable, and not one event
   received since the screen opened.
4. After the fix, a cold start's first visit to the Farm screen reads
   **Agents 3** with **Plan it** enabled. Screenshot in the item's discussion.

Every probe was removed afterwards; none of them is in the change.

## What is not covered automatically

That the detection event arrives from a *real* backend. The test proves the
listener is armed in time; only the application proves the event is emitted at
all, which is `SWEEP-BUG022-01`.
