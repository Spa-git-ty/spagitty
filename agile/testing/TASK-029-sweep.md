<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-029 — Manual sweep

**Item:** [`agile/items/TASK-029-candidate-feature-backlog.md`](../items/TASK-029-candidate-feature-backlog.md)

## Sweep tickets

| Ticket | Preconditions | Steps | Expected result | Priority | Result |
| --- | --- | --- | --- | --- | --- |
| SWEEP-TASK029-01 | Repository is on branch `task/TASK-029-candidate-feature-backlog` | 1. Open `agile/README.md`<br>2. Check that FEAT-062 through FEAT-070 are indexed under Features with status `Backlog`<br>3. Check that TASK-029 is indexed under Tasks with status `Done` | All item links resolve, statuses match table entries, and IDs follow sequential numbering | P1 | Pass |
| SWEEP-TASK029-02 | Repository is clean | 1. Run `bun test tools/record.test.ts` | Test suite runs and passes with zero errors | P1 | Pass |
