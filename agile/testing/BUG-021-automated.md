<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-021 — Automated test record

**Item:** [`agile/items/BUG-021-a-run-says-nothing-until-it-ends.md`](../items/BUG-021-a-run-says-nothing-until-it-ends.md)

## What was written

**The narrator** — `crates/spagitty-farm/src/execution/narrate.rs`, 15 unit
tests, one per rule the table in the plan states. The ones that matter:

- `a_line_that_is_not_json_is_passed_through` and
  `json_of_an_unknown_shape_is_not_swallowed` — the failure mode where a
  narrator hides the one line explaining why a run did nothing.
- `a_handoff_block_survives_narration` — the fence comes out of a JSON string as
  three lines, which is what `Handoff::parse` needs.
- `the_final_result_does_not_repeat_what_was_already_said` and
  `a_result_nobody_said_out_loud_is_still_printed` — the two halves of the
  stateful dedupe, so neither a duplicate handoff nor a lost answer is possible.
- `a_long_command_is_clipped_but_the_agents_prose_is_not` — clipping a `Bash`
  line is right; clipping prose would cut a handoff block in half.

**Through the runner** — `execution::process::tests`,
`a_streamed_run_writes_prose_to_the_transcript_and_keeps_its_handoff`. A real
child process printing real stream-json events, and then three assertions: no
raw event reached the transcript file, the narrated tool line did, and
`Handoff::parse` reads the block back out of the file. This is the test that
would have caught the whole class of mistake in the plan's "alternatives".

**The adapter** — `claude::tests::the_run_streams_rather_than_reporting_once_at_the_end`,
because the flags are the fix and a silent revert of them looks like nothing.

**The screen** — `src/lib/farm/planning.test.ts`, 8 tests: the card shows the
latest line and not the first, skips blanks rather than flickering to empty,
says plainly that the planner has not spoken yet, counts elapsed time from the
run, and stops the planner; the store keeps the planner's transcript under the
identifier no task has, finds the planning run in flight, releases it when it
ends, and does not mistake an implementation run for one.

## Test command and output

```
$ cargo test -p spagitty-farm
test result: ok. 303 passed; 0 failed          (unit)
test result: ok.  26 passed; 0 failed          (tests/pipeline.rs)

$ cargo clippy --all-targets -- -D warnings
Finished `dev` profile

$ bun run test
Test Files  107 passed (107)
     Tests  2377 passed (2377)

$ bun run check
COMPLETED 1117 FILES 0 ERRORS 0 WARNINGS
```

## Coverage

The new Rust module is covered rule by rule; the new Svelte component and both
new store getters have tests. No first-party code was added without tests, so
first-party coverage does not fall, and the Amendment 10 floor of 70% holds.

## What is not covered automatically

That a **real** `claude` run streams. The tests drive the schema captured from
`claude 2.1.259`, not the binary: a provider that changes its event names would
pass every test here and narrate nothing. That is `SWEEP-BUG021-04`, and it is
the reason the narrator falls through to "pass it on" rather than to silence.
