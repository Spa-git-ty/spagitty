<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-031 — Manual sweep

**Item:** [`agile/items/TASK-031-long-sessions-stay-fast.md`](../items/TASK-031-long-sessions-stay-fast.md)

## Sweep tickets

| Ticket | Preconditions | Steps | Expected result | Priority | Result |
| --- | --- | --- | --- | --- | --- |
| SWEEP-TASK031-01 | A farm that has been running long enough to have finished many tasks | 1. Leave it open for an hour of work<br>2. Watch memory and the screen | Neither grows with the number of runs; the screen stays as quick at the end of the session as at the start | P2 | |
| SWEEP-TASK031-02 | A farm with a task that ran early and has been quiet since | 1. Select that task | Its panel still lists its run — the history did not forget it | P1 | |
| SWEEP-TASK031-03 | A task whose agent produced more output than one session's cap | 1. Open the drawer's Transcript tab for it<br>2. Press **Whole log** | The pane fills with the run's whole log from disk and the footer says so | P1 | |
| SWEEP-TASK031-04 | A task that has never run | 1. Press **Whole log** for it | Nothing breaks and nothing is claimed; the pane still says it has heard nothing this session | P2 | |
| SWEEP-TASK031-05 | A farm with two hundred tasks (accept a large plan, or add them) | 1. Open the Farm screen and scroll the list | It opens and scrolls without a pause | P3 | |
