<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-078 — Automated test record

**Item:** [`agile/items/FEAT-078-who-asked-for-this-task.md`](../items/FEAT-078-who-asked-for-this-task.md)

## What was written

**One test per way a task can be born** — `crates/spagitty-farm/tests/pipeline.rs`,
against a real repository and a scripted planner:

- `a_task_a_person_typed_is_recorded_as_theirs`.
- `a_planned_task_names_the_agent_that_planned_it`, including that
  `origin.agent()` answers with it.
- `a_subtask_says_which_task_it_was_cut_out_of`.
- `an_existing_farm_reads_as_the_persons_own_work` — a task deserialised from
  JSON with no `origin` field at all, which is what every task in every farm
  written before this change looks like.

`planner.rs` gained the fourth: a proposal carries the agent that was working
and the task it was thought of during.

**The wording** — `src/lib/farm/describe.test.ts`: one line per origin; a
proposal whose agent is unknown still names the task it came from and never
renders `null`; and only an agent's work is marked.

**The row** — `src/lib/farm/queue.test.ts`: a person's own work carries no mark,
and each of the three agent origins carries one whose tooltip is the sentence.

## Test command and output

```
$ cargo test
test result: ok. 502 passed   (spagitty-core)
test result: ok. 319 passed   (spagitty-farm unit)
test result: ok.  37 passed   (spagitty-farm pipeline)
test result: ok.  73 passed   (spagitty)

$ cargo clippy --all-targets -- -D warnings
Finished

$ bun run test
Test Files  109 passed (109)
     Tests  2432 passed (2432)

$ bun run check
COMPLETED 1122 FILES 0 ERRORS 0 WARNINGS
```

## Coverage

Four creation paths, four tests, plus the wording and the row. The Amendment 10
floor of 70% holds.

## What is not covered automatically

Whether the mark is *legible* — one quiet glyph against an identifier, at every
theme and text size. That is `SWEEP-FEAT078-05`.
