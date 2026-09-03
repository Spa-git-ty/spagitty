<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-074 — Plan

**Item:** [`agile/items/FEAT-074-the-activity-drawer.md`](../items/FEAT-074-the-activity-drawer.md)

**Depends on:** BUG-021, whose narrated lines are what the Transcript tab shows,
and TASK-030, whose history is what the Activity tab pages through.

## Approach

### The timestamp goes on the record, not on the event

`FarmEvent`'s sixteen variants say *what happened*. Adding an `atMs` field to
each would be sixteen places to forget it, and would put a time inside a value
that is also used as a message. `Recorded { at_ms, event }` adds it once, at the
one place events are recorded, with `#[serde(flatten)]` so the wire shape is the
event's own object plus one key — no change to any consumer that reads `kind`.

`#[serde(default)]` on `at_ms` is what lets an existing `events.jsonl` still
load. A missing time reads as zero, and the interface renders zero as blank:
showing 1970 would be worse than showing nothing, because it looks like data.

### The drawer is a panel, not a new mechanism

The application already has resizable, persisted, collapsible panels, and the
only thing it did not have was a horizontal one. So `PanelSpec.side` gains
`bottom`, `Splitter` reads `clientY` when the side is `bottom`, and the drawer
gets its height from `--farm-log-h` like every other panel gets its width.
Collapsing reuses `panels.toggleHidden`.

That is one enum member and about ten lines in the splitter, against a bespoke
drag handler with its own persistence and its own bugs.

### Following and holding are deliberately different things

Following is derived from the scroll position — a pane at the bottom follows,
one scrolled up does not, and nothing has to be set or remembered. Hold is an
explicit freeze with a count of what is waiting behind it.

They are separate because they answer different questions ("keep showing me the
newest" versus "stop moving while I read this"), and because a single toggle
doing both is the design most log viewers ship and the reason people scroll up
to read and then cannot find their place again.

### Motion

Three, all on existing tokens, all behind `prefers-reduced-motion`:

- A line arrives: 110ms, opacity and a two-pixel rise. On the incoming row only,
  so nothing already on screen moves.
- A task row whose status changed under the reader: a 1.1s accent wash that
  fades out. No movement, no size change — a list that jumps drags the eye away
  from what is being read.
- The drawer's height, on open and close: `--t-slow`, height alone.

The first render is deliberately not a change: a list that flashes on arrival is
a list that flashes every time you come back to the screen.

## Alternatives considered

**A third column instead of a drawer.** Offered and not chosen: the log is read
in bursts and the plan is read continuously, and a permanent column costs the
task list width it needs more.

**Timestamping in the webview, on arrival.** No wrapper type, no schema change —
and the times would be when the interface rendered, not when the agent spoke,
with history from disk having no times at all. A log whose times are sometimes
the event's and sometimes the renderer's is worse than one with none.

**A virtualised list.** The drawer shows at most two thousand short rows and the
application already has virtualisation for the graph. Two thousand `<div>`s is
not a performance problem worth the machinery, and the moment the drawer pages
the whole log from disk it will need reconsidering.

## Files

| File | Change |
| --- | --- |
| `crates/spagitty-farm/src/model/event.rs` | `Recorded`. |
| `crates/spagitty-farm/src/service.rs`, `persistence/store.rs` | The observer, the ring and the log carry `Recorded`; `verify` emits through `emit`. |
| `src-tauri/src/farm.rs` | Snapshot and `farm_events` carry `Recorded`. |
| `src/lib/farm/components/ActivityDrawer.svelte` | New. |
| `src/lib/farm/components/TaskRow.svelte` | The wash when a status changes. |
| `src/lib/ui/Splitter.svelte`, `src/lib/panels.svelte.ts`, `src/lib/metrics.ts` | Vertical drag, `farmLog`, `FARM_LOG_H`. |
| `src/lib/ui/icons.ts` | `chevron-up`, `chevron-down`. |
| `src/routes/farm/+page.svelte` | The strip becomes the drawer. |
| `src/testing/DrawerHarness.svelte` | Scaffolding: a drawer whose events change after mount. |
| `docs/screens.md` | 1Q gains the drawer. |

## Risks and rollback

- **An existing `events.jsonl`** loads with no times. That is the designed
  behaviour, not a migration, and the blank column is what says so.
- **The wire shape changed** for anything reading farm events. There is one
  consumer, in this repository.
- **Rollback** is a revert; a log written with times still parses without them.
