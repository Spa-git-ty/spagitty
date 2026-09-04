<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-076 — Manual sweep

**Item:** [`agile/items/FEAT-076-the-farm-takes-on-large-work.md`](../items/FEAT-076-the-farm-takes-on-large-work.md)

## Sweep tickets

| Ticket | Preconditions | Steps | Expected result | Priority | Result |
| --- | --- | --- | --- | --- | --- |
| SWEEP-FEAT076-01 | A farm with a real agent and a task that is plainly too big | 1. Select it<br>2. Press **Break it down**<br>3. Watch the planning card | The planner runs visibly; when it finishes, subtasks appear indented under the task as drafts, and the plan-review band offers them | P1 | |
| SWEEP-FEAT076-02 | As above, after accepting them | 1. Look at the heading's row<br>2. Try to run the heading | It shows `0 of N` and offers no Run; its panel says it finishes when the tasks under it do | P1 | |
| SWEEP-FEAT076-03 | A container whose children can run | 1. Start the farm and let the children finish | The heading reaches Done when the last child does, without anybody pressing anything | P1 | |
| SWEEP-FEAT076-04 | A container with one child blocked or failed | 1. Look at the heading | It reads Blocked, and says something underneath it did not finish | P2 | |
| SWEEP-FEAT076-05 | A container with children | 1. Delete the heading | The children stay in the plan, at the top level, and keep their branches | P1 | |
| SWEEP-FEAT076-06 | Any farm | 1. Settings → Agents at once → 8<br>2. Settings → Attempts → 5<br>3. Restart Spagitty and look again | Both stick; the farm runs up to eight agents and sends a task back up to five times | P2 | |
| SWEEP-FEAT076-07 | A farm with a planning run in flight | 1. Press **Break it down** on a task | It is refused with "Something is already being planned", and the run in flight is untouched | P2 | |
| SWEEP-FEAT076-08 | A goal big enough for it | 1. Press **Plan it** | Up to 24 tasks are adopted rather than 12 | P3 | |
