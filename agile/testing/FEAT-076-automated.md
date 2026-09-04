<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-076 — Automated test record

**Item:** [`agile/items/FEAT-076-the-farm-takes-on-large-work.md`](../items/FEAT-076-the-farm-takes-on-large-work.md)

## What was written

**The container rules, as a table** — `orchestrator/scheduler.rs`, 7 tests:

- `a_container_is_never_started`, and its other half: the child *is* started.
- `a_container_is_done_when_its_children_are`.
- `a_container_with_one_child_stuck_is_blocked`, over `Failed`, `Cancelled` and
  `Blocked` — one child that will never finish is a heading that will never
  finish.
- `a_container_settles_even_while_the_farm_is_paused`.
- `a_container_that_has_already_settled_is_left_alone` — otherwise every pass
  emits a decision and every decision an event, which is a farm that never stops
  talking about a finished task.
- `a_container_is_not_asked_why_it_is_waiting`.
- `the_attempt_limit_is_the_farms_rather_than_a_constant`, both directions.

**The pipeline, against a real repository** — `tests/pipeline.rs`, 5 tests with
a scripted agent that answers a decomposition with two subtasks:

- `breaking_a_task_down_produces_drafts_under_it` — drafts, parented, and the
  agent's own references remapped into real dependencies between the children.
- `a_task_that_was_broken_down_is_not_run_itself`.
- `a_container_follows_its_children_to_done`.
- `deleting_a_heading_does_not_delete_what_was_under_it`.
- `only_one_thing_is_planned_at_a_time`.

**The interface** — `src/lib/farm/store.test.ts` and `queue.test.ts`:

- The outline: parents then children, with a depth per row and the fraction on
  the heading; and a task whose parent was deleted appears at the top level
  rather than disappearing.
- The row: a heading reads as a fraction rather than a kind chip, indents by
  depth, and an ordinary task is unchanged.

## Test command and output

```
$ cargo test
test result: ok. 502 passed   (spagitty-core)
test result: ok. 319 passed   (spagitty-farm unit)
test result: ok.  33 passed   (spagitty-farm pipeline)
test result: ok.  73 passed   (spagitty)

$ cargo clippy --all-targets -- -D warnings
Finished

$ bun run test
Test Files  109 passed (109)
     Tests  2417 passed (2417)

$ bun run check
COMPLETED 1122 FILES 0 ERRORS 0 WARNINGS
```

## Coverage

Every new rule is covered by a test that fails if the rule is removed; the two
new settings are pass-through and covered by the configure path. The Amendment
10 floor of 70% holds.

## What is not covered automatically

That a **real** agent produces a usable decomposition. The scripted planner
proves the pipeline; whether a model breaks a task up sensibly is judgement, and
it is `SWEEP-FEAT076-01`.
