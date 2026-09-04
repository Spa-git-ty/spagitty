<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-021 — Manual sweep

**Item:** [`agile/items/BUG-021-a-run-says-nothing-until-it-ends.md`](../items/BUG-021-a-run-says-nothing-until-it-ends.md)

Tickets 01 to 03 use a scripted agent and cost nothing; 04 onwards need a real
Claude Code, because what they check is that the provider's schema is the one
the narrator was written against.

The **scripted streamer**: a custom agent with executable `/bin/sh` and extra
arguments `-c`, then a body that prints stream-json events with
`printf '%s\n'` — `{"type":"system","subtype":"init","model":"fake"}`, a
`tool_use` event, and a `text` event carrying a `spagitty-handoff` block.

## Sweep tickets

| Ticket | Preconditions | Steps | Expected result | Priority | Result |
| --- | --- | --- | --- | --- | --- |
| SWEEP-BUG021-01 | A farm with the scripted streamer registered as its planner | 1. Press **Plan it**<br>2. Watch the strip under the Farm header | A planning card appears with a pulsing dot, a running elapsed time, and the planner's latest line — updating as the script prints | P1 | |
| SWEEP-BUG021-02 | A planning run in flight, using the slow scripted agent from BUG-020's sweep | 1. Press **Stop planning** | The planner stops at once; the farm returns to Idle; **no tasks are added** | P1 | |
| SWEEP-BUG021-03 | A farm whose planner prints no plan block at all | 1. Press **Plan it** and let it finish | The screen says the planner produced no tasks and points at the transcript; the plan is unchanged | P1 | |
| SWEEP-BUG021-04 | Claude Code detected; a farm with a goal | 1. Press **Plan it**<br>2. Watch for thirty seconds | Lines appear *while it runs*: `· claude-… started`, then tool lines such as `· Read …` and `· Bash …` — not one burst at the end | P1 | |
| SWEEP-BUG021-05 | As above, after the planner finishes | 1. Check that tasks were adopted<br>2. Open `.spagitty/farm/logs/planning/…log` in an editor | Tasks appear as drafts. The log reads as prose and tool lines; there is no raw JSON in it | P1 | |
| SWEEP-BUG021-06 | A task run by Claude Code | 1. Select the task while it runs<br>2. Read its transcript | Its work appears as it happens; at the end the task moves on rather than sticking, which is the handoff having parsed | P1 | |
| SWEEP-BUG021-07 | Codex or another agent that is not Claude Code | 1. Run a task with it | Its output is exactly what it prints in a terminal — unchanged, nothing swallowed | P2 | |
| SWEEP-BUG021-08 | An agent configured with extra arguments, for example `--model haiku` | 1. Run a task | The extra arguments still apply and the run still streams | P3 | |
