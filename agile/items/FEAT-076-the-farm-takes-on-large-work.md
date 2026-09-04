<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-076 — The farm takes on large work

**Status:** Done
**Branch:** `feature/FEAT-076-large-work`
**Screens:** Farm (1Q).

## Problem

A farm could hold twelve tasks and no more, and a task was the smallest thing it
knew about. `planner::MAX_TASKS = 12` capped every plan, and there was no way to
break one task down: a task that turned out to be a week of work had no children
— only a person retyping it as several tasks and wiring the dependencies by
hand.

Two smaller limits made the same point. The interface offered `1, 2, 3, 4`
agents at once while the backend already clamped to eight, and `MAX_ATTEMPTS`
was a constant: the same three tries for a one-line fix and for a piece of work
nobody has understood yet.

## Change

**A task can be broken down, and the task it came out of becomes a container.**

- `Task.parent` names the task a subtask was cut out of. A task is a *container*
  when something names it — derived, never stored, so a task stops being one the
  moment its last child is deleted and no flag is left saying otherwise.
- **Break it down** on the task panel starts a planning run scoped to that task
  rather than to the goal, with a prompt that says so in as many words. Its
  children arrive as `Draft`, so FEAT-075's plan-review band asks before any of
  them runs.
- A container is never started: running the heading would cut a worktree for a
  task whose whole content is "these five things". It follows its children — 
  `Done` when they all are, `Blocked` when one of them will not finish — and a
  dependency on it is satisfied when it is, which is the whole reason to have
  one.
- The list nests: one indent per level, and a container shows `3 of 5`.
- Deleting a container does not delete what was under it. The children lose
  their parent and become work in their own right.

**Bigger, and adjustable.** A plan may hold 24 tasks, a decomposition 8; the
farm runs up to 8 agents at once; and attempts before a task needs a person is a
farm setting from 1 to 10 rather than a constant.

Only one thing is planned at a time. Two planning runs would share the planning
session slot and the second would collect the first one's transcript, which
shows up as a plan that makes no sense.

## Scope

- `Task.parent`, containers in the graph and the scheduler, `decompose`.
- `MAX_TASKS` 12 → 24, `MAX_SUBTASKS` 8, parallelism to 8, `Farm.max_attempts`.
- The outline in the store, the nested rows, **Break it down**.

## Non-scope

- **Breaking a subtask down again.** The walk that renders the outline is
  recursive, so depth is not a shape the interface enforces — but the button is
  offered on a task that is not already a container, and whether a farm should
  grow a third level is a product question, not a technical one.
- **Editing a proposed subtask before accepting it.** The editor already works
  on a draft.
- Reordering the queue by hand. Priority exists and the scheduler reads it.

## Acceptance criteria

- A task can be broken into subtasks by an agent, and they arrive as drafts
  under it.
- A container cannot be run, and says why it is offering no Run button.
- A container reaches `Done` when its children do, even while the farm is
  paused, and `Blocked` when one of them cannot finish.
- Deleting a container leaves its children in the plan.
- A farm can be set to 8 agents at once and to something other than 3 attempts.
- A second planning run is refused while one is in flight.
