<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-078 — Plan

**Item:** [`agile/items/FEAT-078-who-asked-for-this-task.md`](../items/FEAT-078-who-asked-for-this-task.md)

**Depends on:** FEAT-076, which added the fourth way a task can be created and
is one of the places the origin is written.

## Approach

**A tagged enum, not a boolean.** "A person or an agent" answers the question
asked and nothing that follows from it — which agent, cut out of what, proposed
while doing what. Those are the details that make the sentence in the panel
worth reading, and they cost nothing to carry: the enum serialises as
`{ "kind": "planned", "agent": "claude" }` and defaults to `Person`.

**Written where a task is born**, which is four places and no more:
`add_task` (already `Person` by construction, since `Task::new` defaults to it),
`planner::adopt_under` for a plan and for a decomposition, and
`planner::from_proposal`.

Both planner functions gained the agent as an argument. `collect_plan` reads it
back **from the run record** rather than remembering it separately — the run is
already the record of who was asked — and `propose_tasks` takes it from the
task's `implemented_by`, which is who was working when it thought of it.

**The default is `Person`, and that is a claim worth defending.** A task saved
before this existed has no origin, and the only ways to make one then were to
type it or to accept a plan — and accepting a plan is a person's decision too.
Reading old tasks as "the person's own" is therefore honest; reading them as
"unknown" would put a shrug on every row of every existing farm.

**Unmarked for a person's own work.** The mark is provenance, not a warning, so
the rows that are unusual are the ones that carry it.

## Alternatives considered

**Deriving it from the event log.** `TaskCreated` and `TaskProposed` are already
recorded, so in principle the log knows. In practice it is trimmed at two
thousand events and a farm outlives that, so the answer would quietly become
"unknown" for the oldest tasks — the ones most likely to need explaining.

**A colour per origin.** Three colours on a screen that already uses colour for
status; the row would say *what kind of thing this is* twice, in two vocabu­laries.

**Showing the agent's name on the row.** Tried and rejected in the writing: the
row already carries an identifier, a title, a kind, a status and sometimes a
reason. The name lives in the tooltip and the panel.

## Files

| File | Change |
| --- | --- |
| `crates/spagitty-farm/src/model/task.rs` | `TaskOrigin`, and `origin` on `Task`. |
| `crates/spagitty-farm/src/orchestrator/planner.rs` | The agent argument; origins set. |
| `crates/spagitty-farm/src/service.rs` | The agent read from the run and from `implemented_by`. |
| `src/lib/farm/types.ts`, `describe.ts` | The mirror type, `originLine`, `originMark`. |
| `src/lib/farm/components/{TaskRow,TaskDetail}.svelte` | The mark and the line. |

## Risks and rollback

- **An existing farm** reads as the person's own work, by design and by test.
- **An agent removed from the registry** leaves a proposal whose agent is
  unknown; the sentence still names the task it came from, which is the half
  that matters.
- **Rollback** is a revert; the field is ignored by an older build.
