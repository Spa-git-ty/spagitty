<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-076 — Plan

**Item:** [`agile/items/FEAT-076-the-farm-takes-on-large-work.md`](../items/FEAT-076-the-farm-takes-on-large-work.md)

**Depends on:** FEAT-075, whose plan-review band is what asks about the subtasks
a decomposition produces. This branch carries it and the three before it.

## Approach

### A container is derived, not declared

`Task.parent` is the only new field. Whether a task *is* a container is asked of
the graph — `Graph::is_container` — rather than stored beside it. A stored flag
is a second fact about the same thing, and the two disagree the first time a
child is deleted.

Everything else follows from that one relation: `children`, `progress`, and
`container_status`, which answers what a heading should become and `None` while
there is still work to do.

### Containers settle; they do not run

`Graph::ready` filters containers out, so the scheduler never starts one, and
`decide` emits a new `Decision::Settle` when a container's children have moved
it. That decision is produced **before** the "is the farm live" check, because a
paused farm has not un-finished anybody's work and a heading sitting at `Ready`
over five `Done` tasks is a lie about the state of the work.

Settling deliberately does not go through `set_status`. That function enforces
the machine a task with a *run* follows — assigned, verified, reviewed — and a
container has no run. `TaskStatus::can_settle` is the rule that applies instead,
and it lives in the model beside the other one rather than as a special case in
the service.

### Decomposition is the planning run, pointed somewhere else

`plan` and `decompose` both call `start_planning`, which is the old body of
`plan` with two additions: it refuses to start while a farm is already planning,
and it records which task is being broken down. `collect_plan` reads that back
and calls `planner::adopt_under`, which is `adopt` with a parent.

The parent is held in `State` rather than passed to `collect_plan`, because the
collector runs on a thread the Tauri layer spawned from a command that has
already returned — there is nobody left holding an argument.

### The prompt says which job it is

`context::decomposition` puts the task in front of the goal and tells the agent
to break *this task* — not the goal — into smaller ones, and not to restate the
task itself as one of them. It keeps the goal, because a subtask that makes
sense against its parent and not against the goal is a subtask of the wrong
thing.

## Alternatives considered

**A `subtasks: Vec<TaskId>` on the parent.** The same relation written on the
other side, and a list that has to be maintained when a child is deleted.
`parent` cannot go stale in that way: the child carries it, and deleting the
child takes it with it.

**Making a container a different kind of task.** `TaskKind` is read by routing
and nothing else; making one of its variants mean "not work" would put a
scheduling rule inside a routing hint.

**Letting a container run as well as its children.** Offered as an option and
not chosen: a heading with its own worktree is a second answer to "where does
this work live", and the merge order between it and its children has no good
default.

## Files

| File | Change |
| --- | --- |
| `crates/spagitty-farm/src/model/task.rs` | `parent`, `can_settle`, `is_queued`, `is_exhausted_at`. |
| `crates/spagitty-farm/src/model/farm.rs` | `max_attempts`. |
| `crates/spagitty-farm/src/orchestrator/dependency.rs` | `children`, `is_container`, `progress`, `container_status`; `ready` skips containers. |
| `crates/spagitty-farm/src/orchestrator/scheduler.rs` | `Decision::Settle`; the farm's attempt limit. |
| `crates/spagitty-farm/src/orchestrator/planner.rs` | `MAX_TASKS` 24, `MAX_SUBTASKS`, `adopt_under`, `subtask_contract`. |
| `crates/spagitty-farm/src/context.rs` | `decomposition`. |
| `crates/spagitty-farm/src/service.rs` | `decompose`, `start_planning`, `settle`; containers refuse to run; deletion re-parents. |
| `src-tauri/src/farm.rs`, `lib.rs` | `farm_decompose`, `maxAttempts`. |
| `src/lib/farm/store.svelte.ts` | `outline`. |
| `src/lib/farm/components/{TaskRow,TaskDetail}.svelte`, `src/routes/farm/+page.svelte` | Nesting, the fraction, **Break it down**, the two settings. |

## Risks and rollback

- **An existing farm** loads unchanged: `parent` defaults to `None` and
  `max_attempts` to three.
- **A deeper tree than two levels** is not prevented by the data, only by which
  button is offered. If that turns out to be wrong it is a UI change, not a
  migration.
- **Rollback** is a revert. A farm written with parents would lose the relation
  and read as a flat list, which is what it was before.
