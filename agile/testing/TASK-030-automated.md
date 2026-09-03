<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-030 — Automated test record

**Item:** [`agile/items/TASK-030-the-farm-refresh-stops-working-on-the-main-thread.md`](../items/TASK-030-the-farm-refresh-stops-working-on-the-main-thread.md)

## What was written

`crates/spagitty-farm/tests/pipeline.rs`:

- `the_history_is_held_in_memory_and_matches_what_is_on_disk` — runs a real task
  and asserts the in-memory history equals `store::load_events`, that no
  transcript line is kept as history, and that `events_tail` returns the end
  rather than the start. The equality is the assertion that matters: it is what
  stops the ring becoming a cache that can drift.
- `reopening_a_farm_reads_its_history_back` — a second `FarmService::open` on the
  same repository sees the same events.

`src/lib/farm/store.test.ts`:

- `does not ask the backend anything when a transcript line arrives` — subscribes
  for real rather than calling `absorb`, asserts the subscription exists (a
  listener that is not attached would make the rest of the test assert nothing),
  then asserts a transcript line reaches the pane and triggers no snapshot,
  while a status change still does.
- `reads leftover worktrees on open, and not on every refresh`.

## Both fail without the change

- The transcript test, with `scheduleRefresh()` called unconditionally:
  `AssertionError: expected "vi.fn()" to not be called at all, but actually been called 1 times`.
- The Rust tests fail to compile against the old `events()`, which had no
  in-memory history to compare — the reason they are written as an equality
  between the two, rather than as an assertion about a count.

## Test command and output

```
$ cargo test
test result: ok. 502 passed   (spagitty-core)
test result: ok. 303 passed   (spagitty-farm unit)
test result: ok.  28 passed   (spagitty-farm pipeline)
test result: ok.  73 passed   (spagitty)

$ cargo clippy --all-targets -- -D warnings
Finished

$ bun run test
Test Files  107 passed (107)
     Tests  2383 passed (2383)

$ bun run check
COMPLETED 1118 FILES 0 ERRORS 0 WARNINGS
```

Documentation is checked mechanically too: the farm command list in
`docs/architecture.md` was diffed against the registrations in
`src-tauri/src/lib.rs` and matches exactly.

## Coverage

No new first-party code beyond the ring and two commands, all covered. The
Amendment 10 floor of 70% holds.

## What is not covered automatically

That the window is *smoother*. A test can prove no `git` process is spawned per
refresh; only a person watching a long run can say the screen stopped hitching.
That is `SWEEP-TASK030-01`.
