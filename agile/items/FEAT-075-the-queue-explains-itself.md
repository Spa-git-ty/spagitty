<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-075 — The queue explains itself

**Status:** Done
**Branch:** `feature/FEAT-075-queue-explains-itself`
**Screens:** Farm (1Q).

## Problem

Two halves of the same complaint: *"subtasks don't give any feedback, just
pending — on what!"*

**A plan arrived as a pile of drafts and said nothing about itself.** The
planner adopts its tasks as `Draft` deliberately — a person approves a
decomposition before five agents act on it — but the only way to approve one was
to select each task and press **Add to the plan** in its detail panel. An
eight-task plan was eight selections and eight clicks, and the list itself said
nothing: eight rows with a grey `Draft` chip, no band, no count, no hint that
anything was waiting on a decision.

**A task in the queue could not say why it was not running.** `waitingOn` ran
for two statuses and knew one thing — unmet dependencies. It could not know the
others, because they are not in the task list:

- another task holds a lease on the paths this one declared;
- every parallel slot is busy;
- nothing installed can do this kind of work;
- the farm is not running, or its autonomy is Manual.

So the honest answer to "what is it waiting on" was in the scheduler, which
already computes every one of these and then throws them away.

## Change

**A plan is one decision.** When drafts exist, a band above the list says how
many were proposed and offers **Add N to the plan**, **Discard**, and an
all-or-none toggle; every draft row grows a checkbox so a plan can be accepted
in part. `farm_ready_tasks` and `farm_discard_tasks` take the whole list, so
accepting eight tasks is one call and one write rather than eight of each.

**The scheduler says why.** A new pure function, `scheduler::why_waiting`,
returns one sentence per queued task, and the snapshot carries them. It reports
only what the interface cannot work out for itself — deliberately *not* unmet
dependencies, which the screen already knows, because two places writing one
sentence is how they come to disagree.

A row shows, in this order: the task's own note (a verification failure, a
reviewer's words — about *this* task, so it outranks anything general), then the
scheduler's reason, then the dependency the screen worked out itself.

## Scope

- The plan-review band, per-draft checkboxes, and the two bulk commands.
- `why_waiting`, the snapshot's `waiting` map, and the row that reads it.
- `TaskStatus::is_queued`.

## Non-scope

- **Editing a proposed task before accepting it.** The editor already exists and
  works on a draft; folding it into the band would make accepting a plan a form.
- **Re-planning.** "Plan it" already produces a new plan; whether a second plan
  should replace the first or add to it is a product question, not this item's.
- Reordering the queue by hand. Priority already exists and the scheduler reads
  it.

## Acceptance criteria

- A plan of eight tasks is accepted in one action, or in part, or discarded.
- Discarding asks first, and says what is lost.
- A queued task that is not running says why, in one line, on its row.
- The reason names the task holding the files, or the number of agents working,
  or that nothing can do the work.
- A task's own note still wins over the general reason.
- A running task explains nothing, because there is nothing to explain.
