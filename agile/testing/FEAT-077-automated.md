<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-077 — Automated test record

**Item:** [`agile/items/FEAT-077-the-farm-is-worth-watching.md`](../items/FEAT-077-the-farm-is-worth-watching.md)

## What was written

**When a run last spoke** — `crates/spagitty-farm/src/model/run.rs`, 3 tests:
a finished run is not quiet but finished; a run that has never said anything is
measured from when it started, which is the case the feature exists for; and a
run that has spoken is measured from the last thing it said.

**The interface** — `src/lib/farm/watching.test.ts`, 12 tests:

- The ring: its accessible name is the whole sentence (`3 of 7 done, 2 running,
  1 needing you`), an empty farm claims nothing, and the remainder is only
  coloured when something is stuck.
- The strip: who and what and how long; absent entirely when nothing runs — an
  empty shelf is worse than no shelf; a quiet run marked *and* its pulse
  stopped, because the animation is the message; and a chip takes you to its
  task.
- The threshold: silent about a talking run, silent about a finished one however
  long ago it spoke, measured from the start when nothing has been said, and
  holding its tongue until the six minutes are up.
- The delight seam: the agent kinds the layer draws, and a custom agent read as
  `agent` rather than refused.

## Test command and output

```
$ cargo test
test result: ok. 502 passed   (spagitty-core)
test result: ok. 322 passed   (spagitty-farm unit)
test result: ok.  37 passed   (spagitty-farm pipeline)
test result: ok.  73 passed   (spagitty)

$ cargo clippy --all-targets -- -D warnings
Finished

$ bun run test
Test Files  110 passed (110)
     Tests  2448 passed (2448)

$ bun run check
COMPLETED 1125 FILES 0 ERRORS 0 WARNINGS
```

## Coverage

Every new pure function and both new components have tests. The scoring effect
in the page is the one piece exercised only by the manual sweep — it is three
lines of glue over `farmDelight.taskCompleted`, whose inputs are tested and
whose sink already swallows its own errors.

## What is not covered automatically

- **That the motion is pleasant.** A test can assert a class is applied and that
  reduced motion removes it; whether the ring's growth reads as satisfying or as
  fussy is a person's judgement. `SWEEP-FEAT077-06`.
- **That a badge actually unlocks** at the end of a real run — the engine's own
  tests cover the rules; this covers handing it the truth.
