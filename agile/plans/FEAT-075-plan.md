<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-075 — Plan

**Item:** [`agile/items/FEAT-075-the-queue-explains-itself.md`](../items/FEAT-075-the-queue-explains-itself.md)

**Depends on:** FEAT-074, whose branch this is cut on top of. No code
dependency; they touch the same screen.

## Approach

### The reason comes from the scheduler, because only the scheduler knows it

`scheduler::why_waiting(farm, registry, leases)` is a pure function beside
`decide`, and deliberately mirrors it: same graph, same lease clone, same
in-pass accounting where a task about to start takes its slot so the *next* task
is told about it rather than about whatever was running when the pass began.

The alternative — computing it in the webview — would need the lease overlap
rule, the router's capability matching and the registry's availability in
TypeScript. That is three pieces of the engine reimplemented in the interface,
kept in step by hand, to answer a question the engine answers already.

**One fact, one owner.** `why_waiting` does not report unmet dependencies. The
screen has the whole task list and `waitingOn` already says `Waiting for T-3`
correctly. Two implementations of one sentence is how the two come to disagree,
and the one that disagrees is always the one nobody is looking at.

The row's precedence — note, then scheduler, then dependency — is the same idea:
the most specific answer wins.

### A plan is one decision, so it is one call

`ready_all` and `discard_all` on the service, `farm_ready_tasks` and
`farm_discard_tasks` on the Tauri layer. `ready_all` skips a task that is no
longer a draft rather than failing: accepting a plan twice is a double click.

The band selects everything by default, because a plan that was asked for is
usually a plan that is wanted, and the checkbox is there for the one task in
eight that is wrong. The selection is keyed on the set of draft ids, so a new
plan re-selects and an unrelated refresh does not.

## Alternatives considered

**A modal for reviewing the plan.** It is the obvious shape and the wrong one:
the plan has to be read against the tasks already in the list, and a modal hides
exactly that.

**Accepting every draft automatically at the end of planning.** That is what the
`Draft` status exists to prevent — a bad decomposition becoming five agent runs
without anybody reading it.

**Putting the reason in `task.note`.** The note is the task's own record, written
by verification and review and persisted with the farm. "No free agent" is true
for as long as a slot is busy and false a second later; writing it to the note
would put a transient into a durable field, and persist it.

## Files

| File | Change |
| --- | --- |
| `crates/spagitty-farm/src/orchestrator/scheduler.rs` | `why_waiting`, and its table of tests. |
| `crates/spagitty-farm/src/model/task.rs` | `TaskStatus::is_queued`. |
| `crates/spagitty-farm/src/service.rs` | `waiting_reasons`, `ready_all`, `discard_all`. |
| `src-tauri/src/farm.rs`, `lib.rs` | `waiting` on the snapshot; the two bulk commands. |
| `src/lib/farm/components/TaskRow.svelte` | The reason, and the pick checkbox. |
| `src/routes/farm/+page.svelte` | The plan-review band. |
| `src/lib/farm/store.svelte.ts`, `api.ts`, `types.ts` | `waitingFor`, `drafts`, the two calls. |

## Risks and rollback

- **A reason that is stale by the time it is read.** It is computed per snapshot
  and a snapshot follows every burst of events, so it is as fresh as the status
  chip beside it.
- **Discarding is a delete**, and delete already removes the task's worktree. A
  draft has never run, so it has neither — and the confirmation says so.
- **Rollback** is a revert; nothing is persisted in a new shape.
