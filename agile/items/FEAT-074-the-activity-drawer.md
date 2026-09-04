<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-074 — The activity drawer: a log worth reading

**Status:** Done
**Branch:** `feature/FEAT-074-activity-drawer`
**Screens:** Farm (1Q).

## Problem

The Farm screen's log was six lines of text in a footer:

```svelte
{#each activity.slice(-6) as event, index (index)}
    <span class="line">{eventLine(event)}</span>
{/each}
```

No times, so nothing could be placed in a sequence or compared with what a
terminal was showing. No scrollback: the seventh line pushed the first out of
existence, and the events behind it were on disk and unreachable. No filter, so
a farm running three agents interleaved three narratives. And no transcript at
all — what the agents actually *said* was collected by the store, kept per task,
and rendered only inside the selected task's detail panel, as an un-scrolled
`<pre>` with no follow and no history.

The author's report was "log ui is awful", which is the whole of it: supervising
a farm is reading, and there was not enough here to read.

## Change

A resizable, collapsible drawer along the bottom of the Farm screen, with two
tabs.

- **Activity** — the farm's own record: created, moved, verified, reviewed,
  merged. Timestamped, filterable to one task, as long as the history is.
- **Transcript** — what one agent said, for one task at a time, with the planner
  offered while it is planning.
- **Following** is where the scrollbar is, not a setting: the pane sticks to the
  newest line while the reader is at the bottom and lets go when they scroll up.
- **Hold** is a setting: it freezes the list so a line can be read while it is
  still arriving, and counts what arrived while it was held.
- **Copy** takes what is shown, filter and all.
- The height is dragged and persists like every other panel, and the drawer
  collapses to its own tab bar rather than disappearing.

Events gained a time to show. `FarmEvent` did not carry one — the variants say
*what* — so a `Recorded { atMs, event }` wrapper adds it once, where the event
is recorded, and is flattened on the wire so an event is still its own object
with one more key. Lines written before the field existed read as zero, and zero
is shown as no time rather than as 1970.

**Motion**, on the application's existing tokens and behind
`prefers-reduced-motion`: a line arrives with a 110ms fade and a two-pixel rise
that moves nothing already on screen; a task row washes with the accent for a
second when its status changes under the reader; the drawer's height transitions
when it opens.

## Scope

- The drawer, its two tabs, filter, follow, hold, copy, collapse and resize.
- `Recorded`, and timestamps end to end.
- The `Splitter` learns to drag vertically; `PANELS` learns a `bottom` side.
- Motion on new lines and on a row whose status changed.

## Non-scope

- **Reading a previous run's transcript from disk.** `farm_transcript` and
  `farm_events` are both wired and neither is called by the drawer yet: it shows
  what this session has heard. Paging the history is worth its own item, with
  the scroll-to-load behaviour that goes with it.
- Searching the log. A filter by task is what a farm with four agents needs;
  full-text search over a transcript is a different feature.

## Incidental corrections

Two, both in code this item had to touch, both recorded rather than quietly
folded in:

- **`Splitter`'s keyboard resizing moved the wrong panel.** `onkeydown` ended in
  `if (panel === 'rail') panels.setRail(…) else panels.setDetail(…)`, so an
  arrow key on any of the four panels added by FEAT-037 resized the graph's
  detail panel instead. It now sets the panel it is bound to.
- **Verification events were never recorded.** `verify` sent
  `VerificationStarted` and `VerificationFinished` straight to the observer
  rather than through `emit`, so they reached the screen live and were in
  neither the log on disk nor the history a reopened farm reads back.

## Acceptance criteria

- Every activity line carries the time it happened.
- The drawer holds the whole history the snapshot carries, not six lines.
- The activity can be filtered to one task, and only tasks that have said
  something are offered.
- An agent's transcript is readable beside the activity without opening the task.
- Hold freezes the list and says how much arrived while it was held; releasing
  catches up.
- The drawer drags to a height, collapses, and remembers both.
- Nothing moves for a reader who has asked for reduced motion.
