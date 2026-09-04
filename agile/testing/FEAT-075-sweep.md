<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-075 — Manual sweep

**Item:** [`agile/items/FEAT-075-the-queue-explains-itself.md`](../items/FEAT-075-the-queue-explains-itself.md)

## Sweep tickets

| Ticket | Preconditions | Steps | Expected result | Priority | Result |
| --- | --- | --- | --- | --- | --- |
| SWEEP-FEAT075-01 | A farm whose planner has just produced several tasks | 1. Look at the task list | A band says how many were proposed and that nothing has started them; every draft row has a checkbox, all ticked | P1 | |
| SWEEP-FEAT075-02 | As above | 1. Untick two<br>2. Press **Add N to the plan** | Exactly the ticked tasks become Ready; the two unticked stay drafts and the band still offers them | P1 | |
| SWEEP-FEAT075-03 | A farm with drafts | 1. Press **Discard** | A confirmation says what is lost; agreeing removes those tasks and leaves the rest | P1 | |
| SWEEP-FEAT075-04 | A farm with more ready tasks than `Agents at once` allows | 1. Start it<br>2. Read the rows that are not running | Each says `No free agent — N of M are working.` and starts as slots free up | P1 | |
| SWEEP-FEAT075-05 | Two ready tasks whose allowed paths overlap (for example `src/**` and `src/auth/tokens.rs`) | 1. Start the farm | The second says `TASK-00X is working on the same files.`, naming the task actually holding them, and starts when the first finishes | P1 | |
| SWEEP-FEAT075-06 | A farm with autonomy Manual, and one paused | 1. Read a ready task's row in each | `Autonomy is Manual, so nothing starts on its own.` and `The farm is not running.` | P2 | |
| SWEEP-FEAT075-07 | A task whose verification failed | 1. Read its row | The verification failure is shown, not a general queue reason | P2 | |
| SWEEP-FEAT075-08 | A farm restricted to an agent that is not installed (Settings → agents) | 1. Read a ready task's row | `No agent is available for this kind of work.` | P3 | |
| SWEEP-FEAT075-09 | Any farm with drafts | 1. Click a draft's checkbox<br>2. Click the row itself | The checkbox picks without selecting; the row selects without unticking | P2 | |
