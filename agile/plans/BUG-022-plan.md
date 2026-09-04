<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-022 — Plan

**Item:** [`agile/items/BUG-022-the-farm-subscribes-after-it-asks.md`](../items/BUG-022-the-farm-subscribes-after-it-asks.md)

## Approach

Two statements change places:

```ts
await this.listen();
apply(await api.open(path));
```

That is the whole fix, and it is the right one because it removes the window
rather than narrowing it. `listen()` is idempotent and touches nothing but the
subscription, so arming it first has no other effect; every other order leaves
some interval in which the backend can answer into silence.

## Alternatives considered

**Refresh once, a second after opening.** The shape that hides the bug rather
than fixing it: it works when detection takes less than a second and fails
quietly when a slow shim makes it take two. It also spends a snapshot on every
farm that opens, for a case that only matters at startup.

**Have `farm_open` block until detection finishes.** It is what the crate's own
header argues against: opening a repository would wait on four agent CLIs, and
`FarmService::open` documents why detection is a separate call.

**Replay missed events from the backend.** A real design — a sequence number
per event and a `since` argument — and enormously more than this needs. The
event that was lost is recomputable by asking for a snapshot; the only problem
was that nothing knew to ask.

## Files

| File | Change |
| --- | --- |
| `src/lib/farm/store.svelte.ts` | `open()` subscribes first, with the reason. |
| `src/lib/farm/store.test.ts` | The regression test. |

## Risks and rollback

- **A listener attached before a farm exists.** It already was: `listen()` is
  called on every open and the handler tolerates any event. Nothing in it reads
  the farm.
- **Rollback** is a two-line revert.
