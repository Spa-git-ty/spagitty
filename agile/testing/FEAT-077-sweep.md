<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-077 — Manual sweep

**Item:** [`agile/items/FEAT-077-the-farm-is-worth-watching.md`](../items/FEAT-077-the-farm-is-worth-watching.md)

A **slow scripted agent** makes the quiet tickets deterministic: a custom agent
whose body is `printf 'starting\n'; sleep 600` says one thing and then goes
silent, which is exactly the shape being tested.

## Sweep tickets

| Ticket | Preconditions | Steps | Expected result | Priority | Result |
| --- | --- | --- | --- | --- | --- |
| SWEEP-FEAT077-01 | A farm with several tasks in different states | 1. Look at the header ring | Done fills it, what is running is a brighter arc at the leading edge, and anything blocked colours the rest. The count beside it agrees | P1 | |
| SWEEP-FEAT077-02 | A farm running two or more agents | 1. Look above the plan | One chip per working agent: who, what it is on, how long. Clicking one selects that task | P1 | |
| SWEEP-FEAT077-03 | As above | 1. Let every run finish | The strip goes away entirely rather than leaving an empty band | P1 | |
| SWEEP-FEAT077-04 | The slow scripted agent, running a task | 1. Wait six minutes<br>2. Watch the chip and the task's row | Both say `No output for …`; the chip's dot stops breathing and turns amber. **The run is still going** — nothing stopped it | P1 | |
| SWEEP-FEAT077-05 | As above | 1. Press Stop yourself | It stops when *you* say so, immediately | P1 | |
| SWEEP-FEAT077-06 | Any farm with work moving | 1. Watch for a minute without interacting | The ring grows rather than jumping, chips arrive rather than appearing, and nothing that is being read moves under the eye | P2 | |
| SWEEP-FEAT077-07 | System setting "reduce motion" on | 1. Repeat 06 | Nothing animates: no pulse, no arriving chip, no growing arc | P2 | |
| SWEEP-FEAT077-08 | A farm that takes a task all the way to Done, with verification and a review | 1. Let it finish<br>2. Open Badges (1P) | The implementing agent has a record here, and whatever it earned. A task that reached review with nothing configured to check it does **not** count as tests passed | P1 | |
| SWEEP-FEAT077-09 | As above | 1. Refresh the Farm screen a few times with that task selected | The agent is scored once, not once per refresh | P2 | |
| SWEEP-FEAT077-10 | A farm with nothing running | 1. Leave the screen open for a few minutes<br>2. Watch CPU | Nothing ticks: the clock runs only while something does | P3 | |
