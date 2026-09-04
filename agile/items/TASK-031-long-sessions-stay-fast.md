<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-031 — A long session stays fast

**Status:** Done
**Branch:** `task/TASK-031-long-sessions-stay-fast`
**Screens:** Farm (1Q).

## Problem

`State::runs` was a `Vec` that was only ever pushed to. Every run of every task
for the life of the process stayed in memory and was cloned into every snapshot
— and a snapshot is taken after every burst of events. A farm left running for a
day paid for everything it had already done, on every refresh.

Second, a long run's early lines were simply gone from the interface. The store
keeps five hundred lines per task, deliberately, and the run's own log holds all
of it on disk — but `farm_transcript`, written in FEAT-073 for exactly this, had
never been called by anything.

## Change

**The history is bounded**, by two rules that only make sense together: the most
recent two hundred runs, **and** the newest run of every task the farm still
has. The second is what makes the first safe — a task's own panel shows its
runs, and a task that has been quiet for a day would otherwise open on an empty
panel because two hundred other runs happened since. Both bounds are things a
person can see: a number, and how many tasks they are looking at.

A dropped run has not lost its transcript. That is on disk and outlives the
farm, which is the other half of this item.

**The drawer can read the whole log.** The Transcript tab offers *Whole log*,
which reads the run's own file through `farm_transcript` and replaces what this
session happened to hear with everything the run said. The footer says which of
the two is on screen.

**And a number, so the next person has one.** A test builds a farm of two
hundred tasks and asserts what it serialises to. At the time of writing that is
412 bytes a task, 82KB in total — which is the answer to "is the snapshot the
problem", and it is no.

## Scope

- `State::remember_run`, `MAX_RUNS`, and forgetting a dropped run's clock.
- *Whole log* in the drawer, over the existing `farm_transcript`.
- The size measurement.

## Non-scope

- **Persisting runs.** They are in memory only, so a restart loses the list and
  keeps the transcripts. Making the run history durable is a real feature and a
  different one.
- **Paging the log as you scroll.** *Whole log* reads the bounded 256KB tail in
  one go, which is what the command already returns. Scroll-to-load is worth
  doing when somebody has a run that overflows it.
- Optimising anything the measurement did not show. Nothing else here was slow.

## Acceptance criteria

- The run history stops growing, and no task the farm still has loses its
  newest run.
- A dropped run takes its "last spoke" clock with it.
- A task's whole log can be read from disk in the drawer, and the footer says
  when that is what is shown.
- The size of a two-hundred-task farm is asserted rather than assumed.
