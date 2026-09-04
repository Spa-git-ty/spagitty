<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-031 — Automated test record

**Item:** [`agile/items/TASK-031-long-sessions-stay-fast.md`](../items/TASK-031-long-sessions-stay-fast.md)

## What was written

`crates/spagitty-farm/src/service.rs`, three unit tests against
`State::remember_run` — private, and tested from the module's own tests rather
than through a service, because six hundred real agent runs to prove a bound
would be a suite nobody runs:

- `the_history_is_bounded` — three times the limit in, no more than the limit
  out, and it is the recent end that survives.
- `a_task_the_farm_still_has_keeps_its_newest_run` — the half that makes the
  bound safe.
- `forgetting_a_run_forgets_its_clock_too` — otherwise FEAT-077's map of "when
  did this last speak" grows forever beside a list that does not.

`crates/spagitty-farm/tests/pipeline.rs` —
`a_farm_of_two_hundred_tasks_still_serialises_small`, which is a measurement
with an assertion around it rather than a test of behaviour.

## The first draft of the rule was wrong, and a test said so

"The last two hundred, plus the newest run of every task" bounds nothing: in a
farm where every run belongs to a different task — the normal case — it keeps
everything. `the_history_is_bounded` failed with `the history grew to 301` the
first time it ran, and the rule became "every task **the farm still has**".

That is the argument for writing a bound as a test rather than as a comment.

## What was measured

```
200 tasks serialise to 82572 bytes, 412 a task
```

So the snapshot is not the expensive thing, and nothing else was optimised on
suspicion.

## Test command and output

```
$ cargo test
test result: ok. 502 passed   (spagitty-core)
test result: ok. 325 passed   (spagitty-farm unit)
test result: ok.  38 passed   (spagitty-farm pipeline)
test result: ok.  73 passed   (spagitty)

$ cargo clippy --all-targets -- -D warnings
Finished

$ bun run test
Test Files  110 passed (110)
     Tests  2448 passed (2448)
```

## What is not covered automatically

*Whole log* against a real run's file on disk — the drawer's button is wired to
`farm_transcript`, whose own behaviour is tested in the crate, but the round
trip is `SWEEP-TASK031-03`.
