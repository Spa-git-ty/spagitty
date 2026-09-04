<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-077 — Plan

**Item:** [`agile/items/FEAT-077-the-farm-is-worth-watching.md`](../items/FEAT-077-the-farm-is-worth-watching.md)

**Depends on:** FEAT-074 for the motion tokens and the drawer this sits above,
FEAT-078 for nothing but the branch it is cut on.

## Approach

### When a run last spoke, without paying for it

`RunSink` already sees every line — it is what turns them into events — so it is
where the timestamp comes from. It writes an `AtomicU64` shared with the service
rather than taking the farm lock: this happens once per line of output, which
for a talkative agent is thousands of times, and nothing waits on the value.
`runs()` folds it in when somebody asks.

`quiet_for_ms` is on `AgentRun` and returns `None` for a finished run — a
finished run is not quiet, it is finished — and measures from `started_ms` when
a run has never said anything, which is the case the whole feature exists for.

### The ring is one SVG, not four bars

Four numbers, one question. Done fills the ring; running is a second arc offset
to the leading edge of the first, which is what makes "working" and "stopped
here" different shapes; blocked recolours the remainder. Two `<circle>`s and a
`stroke-dasharray`, no layout of its own, so it drops into a header that already
holds chips.

The `aria-label` carries the whole sentence. A ring that only says it in colour
says it to some readers.

### One clock, on the screen

Elapsed times and the quiet threshold change without any event, and they must
change together — two intervals drift and show two different nows in one header.
The screen owns `now`, ticks every five seconds, and only while something is
running or planning. Everything else stays a function of events, as the screen's
header says.

### The delight seam is a seam, not a dependency

`src/lib/farm/delight.ts` is the only file in `src/lib/farm` that imports the
delight layer, and it imports nothing back. It follows `delight/watch.ts`'s
shape exactly: fire-and-forget, no return value anybody acts on, and `record`
already swallows its own errors — a badge is not worth one millisecond of a
merge.

It is fed from the task panel's effect rather than from the store, because the
event wants the task *and* its verification *and* its review, and the panel is
where all three are already loaded. A `Set` of counted task ids stops a refresh
awarding the same task twice.

**`testsPassed` is `passed && !unverified`.** The one place where "nothing
checked it" could quietly become a pass, in a layer whose whole job is handing
out credit.

## Alternatives considered

**A progress bar.** Says the same thing in a shape that wants a whole row; the
header has chips in it and a ring is 22 pixels.

**Emitting the delight event from Rust.** The delight layer is a front-end store
with its own persistence, and the crate has no business knowing it exists. The
farm reports; the interface decides what that is worth.

**Killing a run that has gone quiet.** Offered to the author and declined by
them, for the right reason: a slow model and a dead process look the same, and
only one of the two responses is reversible.

## Files

| File | Change |
| --- | --- |
| `crates/spagitty-farm/src/model/run.rs` | `last_output_ms`, `quiet_for_ms`. |
| `crates/spagitty-farm/src/service.rs` | The sink's clock, `State::heard`, `runs()` folds it in. |
| `src/lib/farm/components/ProgressRing.svelte` | New. |
| `src/lib/farm/components/AgentStrip.svelte` | New. |
| `src/lib/farm/delight.ts` | New — the seam. |
| `src/lib/farm/describe.ts` | `QUIET_AFTER_MS`, `quietLine`. |
| `src/routes/farm/+page.svelte` | The ring, the strip, the clock, the scoring effect. |

## Risks and rollback

- **A wrong badge is worse than no badge.** Hence `testsPassed` reading
  `unverified` correctly, and the per-session `Set` against double-counting. The
  engine itself is already idempotent per badge.
- **The clock is a timer on a screen that says it has none.** It ticks only
  while something runs, and the header's comment now says which exception it is.
- **Rollback** is a revert; `last_output_ms` defaults to absent and older builds
  ignore it.
