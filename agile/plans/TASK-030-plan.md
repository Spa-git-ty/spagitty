<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-030 — Plan

**Item:** [`agile/items/TASK-030-the-farm-refresh-stops-working-on-the-main-thread.md`](../items/TASK-030-the-farm-refresh-stops-working-on-the-main-thread.md)

**Depends on:** BUG-020 and BUG-021, whose refresh path this measures.

## Approach

**The history moves into the service.** `FarmService` gains a
`Mutex<VecDeque<FarmEvent>>`, filled from `store::load_events` once in `open`
and appended in `emit`, capped at the same `MAX_EVENTS` the file is trimmed to.
`events()` reads it; `events_tail(limit)` reads the end of it.

The file stays the record — this is not a write-behind cache, and there is no
path where the two can disagree, because everything that appends to one appends
to the other in the same function. The pipeline test asserts they are equal
after a run, and that a reopened farm reads the same history back.

**Leftovers become their own command.** `farm_stale`, called when the farm opens
and after a sweep. Those are the only two moments the answer can change: a
leftover is a worktree whose task no farm claims, and a running farm claims all
of its own.

**A snapshot carries two hundred events**, which is more than the activity list
renders. `farm_events(limit)` exists for a reader scrolling further back, and is
what the log will page through when it becomes something worth scrolling.

**The listener stops refreshing on transcript lines.** One condition, and the
comment beside it says what it cost.

## Alternatives considered

**Reading the log incrementally by byte offset.** Correct, and more machinery
than the problem needs: the whole log is bounded at two thousand events, so
holding it is a few hundred kilobytes and reading it once is the same read the
incremental version does first.

**Keeping `stale` in the snapshot and caching the worktree list.** A cache with
no invalidation event — nothing tells the farm a user removed a worktree by
hand. Asking at the two moments it can change is the same answer without the
cache.

**Throttling the refresh instead of filtering events.** A throttle answers "how
often", and the question here is "why at all": a transcript line contains
nothing the snapshot reports.

## Files

| File | Change |
| --- | --- |
| `crates/spagitty-farm/src/service.rs` | `recent` ring; `events`, `events_tail`; `emit` appends. |
| `src-tauri/src/farm.rs`, `lib.rs` | `stale` out of the snapshot; `farm_stale`, `farm_events`; `SNAPSHOT_EVENTS`. |
| `src/lib/farm/store.svelte.ts`, `api.ts`, `types.ts` | `leftovers()`; no refresh on `agentOutput`. |
| `src/routes/farm/+page.svelte` | Clean up re-reads leftovers. |
| `docs/architecture.md` | The farm crate, `farm.rs`, and the farm commands. |

## Risks and rollback

- **Memory.** Two thousand events, each a small enum — hundreds of kilobytes for
  a farm that has been running all day, against a `git` process every quarter
  second.
- **A snapshot no longer carrying every event.** The activity list keeps three
  hundred and the snapshot carries two hundred; a screen opened on an old farm
  shows the most recent two hundred rather than everything, and `farm_events`
  is there for the rest.
- **Rollback** is a revert; nothing on disk changes shape.
