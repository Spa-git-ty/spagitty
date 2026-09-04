<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-031 — Plan

**Item:** [`agile/items/TASK-031-long-sessions-stay-fast.md`](../items/TASK-031-long-sessions-stay-fast.md)

**Depends on:** FEAT-077, whose per-run clock is the second thing that has to be
forgotten when a run is.

## Approach

**One function, where runs are recorded.** `State::remember_run` replaces two
`state.runs.push(…)` calls, so there is one place that knows the rule and no way
to add a run without applying it.

The rule is "the last `MAX_RUNS`, plus the newest run of each task the farm still
has". The first draft was "plus the newest of every task", which does not bound
anything: in a farm where every run belongs to a different task — the normal
case — it keeps everything. The test caught that immediately, which is the
argument for writing the bound as a test rather than as a comment.

A run whose task has been deleted is dropped like any other: it is history
nobody can navigate to.

**Whole log reads what already exists.** `farm_transcript` returns the bounded
tail of a run's file. The drawer keeps what it reads per task for as long as it
is open, and prefers it over the session's lines once it has it — the file
contains everything the session heard and everything before it, so there is
nothing to merge.

**Measure, then stop.** The size test exists to give the next person a number
instead of an opinion, and it is asserted loosely — the point is to notice a
change of *order*, such as a snapshot that starts carrying transcripts, not to
police a few bytes. It says 412 bytes a task today, so nothing else here was
worth optimising and nothing else here was optimised.

## Alternatives considered

**A ring buffer of runs.** Same bound, and it loses the "newest per task"
guarantee that makes the bound safe to have.

**Persisting runs to disk and paging them.** A real feature — "what has this
farm ever done" — and much larger than this. The transcripts are already durable
and this item stops the *memory* growing, which is what was actually wrong.

**Trimming on read instead of on write.** Every read would pay for the trim, and
the reads are the thing this item is about.

## Files

| File | Change |
| --- | --- |
| `crates/spagitty-farm/src/service.rs` | `MAX_RUNS`, `State::remember_run`, and its tests. |
| `crates/spagitty-farm/tests/pipeline.rs` | The size measurement. |
| `src/lib/farm/components/ActivityDrawer.svelte` | *Whole log*. |
| `src/routes/farm/+page.svelte` | Wires it to `farm_transcript`. |

## Risks and rollback

- **A run dropped while its task panel is open.** The panel reads runs from the
  snapshot, so it would show one fewer; the task's newest is never dropped,
  which is the one the panel leads with.
- **Rollback** is a revert; nothing on disk changes.
