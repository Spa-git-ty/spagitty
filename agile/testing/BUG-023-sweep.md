<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-023 — Manual sweep

**Item:** [`agile/items/BUG-023-a-record-test-reads-another-tests-clone.md`](../items/BUG-023-a-record-test-reads-another-tests-clone.md)

A sweep of a test fix is a run of the suite, so this is short.

## Sweep tickets

| Ticket | Preconditions | Steps | Expected result | Priority | Result |
| --- | --- | --- | --- | --- | --- |
| SWEEP-BUG023-01 | A clean checkout of this branch | 1. `cargo test -p spagitty-core --lib shell::tests::a_clone` ten times | Ten passes. Before the fix this failed about half the time | P1 | |
| SWEEP-BUG023-02 | As above | 1. `cargo test` for the whole workspace | Green, and no slower in any way you would notice | P2 | |
| SWEEP-BUG023-03 | A pull request on GitHub | 1. Watch gate 3 over several runs | It stops failing on a test that has nothing to do with the change under review | P1 | |
