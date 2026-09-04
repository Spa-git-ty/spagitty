<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-078 — Manual sweep

**Item:** [`agile/items/FEAT-078-who-asked-for-this-task.md`](../items/FEAT-078-who-asked-for-this-task.md)

## Sweep tickets

| Ticket | Preconditions | Steps | Expected result | Priority | Result |
| --- | --- | --- | --- | --- | --- |
| SWEEP-FEAT078-01 | A farm with an agent | 1. Add a task by hand<br>2. Press **Plan it** and accept the plan | Your own task carries no mark; every planned task carries one, and its panel names the agent that cut it out of the goal | P1 | |
| SWEEP-FEAT078-02 | A task broken down (FEAT-076) | 1. Open a subtask's panel | It names the agent and the task it was cut out of | P1 | |
| SWEEP-FEAT078-03 | A run whose agent proposed further work in its handoff | 1. Find the proposed task | Its panel says the agent proposed it while working on that task, and that nobody asked for it | P1 | |
| SWEEP-FEAT078-04 | A farm created before this change (`0.4.1-alpha` or earlier) | 1. Open it | Every existing task reads as yours and carries no mark — not "unknown" | P1 | |
| SWEEP-FEAT078-05 | Any farm with both kinds of task | 1. Look at the list in a light theme and a dark one, at two text sizes<br>2. Hover the mark | The mark is visible without being loud, does not crowd the identifier, and its tooltip is the whole sentence | P2 | |
| SWEEP-FEAT078-06 | A farm whose agent has since been forgotten in Settings | 1. Open a task that agent proposed | It still names the task the proposal came from rather than showing an empty name | P3 | |
