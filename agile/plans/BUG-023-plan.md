<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-023 — Plan

**Item:** [`agile/items/BUG-023-a-record-test-reads-another-tests-clone.md`](../items/BUG-023-a-record-test-reads-another-tests-clone.md)

## Approach

Two changes, and both are wanted — either alone would make the failure rarer
rather than impossible.

**Everything that writes a clone to the record takes the gate.** That is what
the gate is for, and the two tests that skipped it were the only writers not
holding it. This is the fix that removes the race.

**The reader identifies its own entry.** `find(argv[1] == "clone")` asks "was a
clone recorded", when the assertion that follows is about *this* clone's URL.
Matching on `example.invalid` — the host this test invents precisely because
nothing else uses it — makes the question the one the test means. This is the
fix that makes the assertion honest even if a future test writes a clone without
the gate.

## Alternatives considered

**`--test-threads=1` for this crate.** It would hide the race and cost the whole
suite its parallelism, for two tests.

**A per-thread record.** The structural answer, and out of proportion: the
record is process-wide because the feature it serves is process-wide, and
changing that to satisfy a test would be the test dictating the design.

**Deleting the assertion.** It is the one that proves a credential never reaches
the log. It stays.

## Files

| File | Change |
| --- | --- |
| `crates/spagitty-core/src/shell.rs` | The gate on two tests; the reader matches its own entry. |

## Risks and rollback

- **The gate serialises three tests** that each run a real `git clone` of a
  fixture. They take about a quarter of a second together.
- **Rollback** is a revert, and returns a flake.
