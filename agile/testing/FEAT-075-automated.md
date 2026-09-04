<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-075 — Automated test record

**Item:** [`agile/items/FEAT-075-the-queue-explains-itself.md`](../items/FEAT-075-the-queue-explains-itself.md)

## What was written

**The reasons, as a table** — `crates/spagitty-farm/src/orchestrator/scheduler.rs`,
8 tests, one per row of the table the item lists:

- `a_task_that_is_about_to_start_has_nothing_to_explain` — the negative case
  first, because a function that always has an opinion is worse than none.
- `a_stopped_farm_says_so_rather_than_blaming_the_task`.
- `manual_autonomy_says_nothing_starts_on_its_own`.
- `a_task_waiting_for_the_files_another_holds_names_the_holder` — the reason
  that cannot be computed anywhere else, with a real lease held.
- `a_full_farm_says_how_full_it_is`.
- `a_task_nothing_can_do_says_that_rather_than_looking_queued`.
- `an_exhausted_task_says_it_needs_a_person`.
- `a_draft_is_not_a_queue_the_farm_is_failing_to_serve` — a draft is a decision
  nobody has made, which is the band's job, not the scheduler's.
- `the_second_of_two_queued_tasks_is_told_about_the_first` — the in-pass
  accounting `decide` also does.

**The row** — `src/lib/farm/queue.test.ts`, 6 tests: the scheduler's sentence is
shown; the dependency fallback is used when there is none; the task's own note
outranks both; a running task explains nothing; a draft is picked without also
selecting the row; a task that is not being picked has no checkbox.

**The store** — `src/lib/farm/store.test.ts`: `waitingFor` reads the snapshot's
map and answers `null` for a task nobody mentioned; `drafts` lists exactly the
proposed tasks.

## Test command and output

```
$ cargo test
test result: ok. 502 passed   (spagitty-core)
test result: ok. 312 passed   (spagitty-farm unit)
test result: ok.  28 passed   (spagitty-farm pipeline)
test result: ok.  73 passed   (spagitty)

$ cargo clippy --all-targets -- -D warnings
Finished

$ bun run test
Test Files  109 passed (109)
     Tests  2407 passed (2407)

$ bun run check
COMPLETED 1122 FILES 0 ERRORS 0 WARNINGS
```

## Coverage

The new Rust function is covered rule by rule; both new front-end behaviours
have tests. The Amendment 10 floor of 70% holds.

## What is not covered automatically

- **The band's arithmetic under a live plan** — accepting three of eight and
  watching the other five stay drafts. The unit tests cover the pieces; the flow
  is `SWEEP-FEAT075-01` and `-02`.
- **That a real contended plan produces the contended-path sentence.** The lease
  test holds a lease by hand; two agents actually racing for `src/**` is
  `SWEEP-FEAT075-05`.
