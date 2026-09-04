<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-020 — Automated test record

**Item:** [`agile/items/BUG-020-the-window-freezes-while-the-farm-plans.md`](../items/BUG-020-the-window-freezes-while-the-farm-plans.md)

## What was written

One test, at the integration layer, because the fault is not visible at any
other one: the unit under test is a lock's lifetime, and the only way to observe
a lock that is *not* held is a second thread that takes it.

`crates/spagitty-farm/tests/pipeline.rs` —
`planning_does_not_hold_the_lock_that_starts_and_stops_tasks`:

1. Registers a scripted planner that sleeps for two seconds before printing its
   plan block, so a held lock is unmistakable and the suite still finishes.
2. Starts a real planning run through `FarmService::plan`, and calls
   `collect_plan` on a second thread — the shape the Tauri layer uses.
3. From a third thread, calls `cancel_task`, which takes the `sessions` lock and
   nothing else of interest, and reports through a channel.
4. Asserts the channel answers within 750 ms — a quarter of the planner's own
   two seconds, so the test cannot pass by the run happening to be quick.
5. Then joins the collector and asserts the plan still arrives as one `Draft`
   task, so the fix is not "skip the wait".

`Harness::service` moved behind an `Arc` to make step 2 expressible. Every other
test reaches the service through `Deref` and is unchanged.

## It fails without the fix

Confirmed by restoring the original `if let` in `collect_plan` and running the
test again:

```
thread 'planning_does_not_hold_the_lock_that_starts_and_stops_tasks' panicked at crates/spagitty-farm/tests/pipeline.rs:762:5:
a command needing the sessions lock waited for the planning run to finish — the guard is being held across the wait (BUG-020)
test result: FAILED. 0 passed; 1 failed
```

## Test command and output

```
$ cargo test -p spagitty-farm
test result: ok. 26 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 2.10s

$ cargo clippy --all-targets -- -D warnings
Finished `dev` profile [unoptimized + debuginfo] target(s) in 25.20s
```

## Coverage

`crates/spagitty-farm` is exercised by 26 integration tests and the crate's own
unit tests; the three lines this change touches are all on the path the new test
drives. No first-party code was added that is not covered, so the Amendment 10
floor of 70% is unmoved by this change.

## What is not covered automatically

That the *window* keeps painting. A test can prove the lock is free; only a
person watching the application can prove the event loop is. That is
`SWEEP-BUG020-01`.
