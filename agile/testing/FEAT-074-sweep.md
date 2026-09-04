<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-074 — Manual sweep

**Item:** [`agile/items/FEAT-074-the-activity-drawer.md`](../items/FEAT-074-the-activity-drawer.md)

## Sweep tickets

| Ticket | Preconditions | Steps | Expected result | Priority | Result |
| --- | --- | --- | --- | --- | --- |
| SWEEP-FEAT074-01 | A farm with history — several tasks, at least one run | 1. Open the Farm screen<br>2. Read the drawer's Activity tab | Every line has a time; the list scrolls back through the whole history, not six lines | P1 | |
| SWEEP-FEAT074-02 | A farm with two or more tasks that have run | 1. Pick a task in the drawer's filter | Only that task's lines remain; the picker offers only tasks that have said something | P1 | |
| SWEEP-FEAT074-03 | A task running under a real agent | 1. Switch to Transcript<br>2. Watch | Its lines arrive as the agent works; the pane follows the newest line | P1 | |
| SWEEP-FEAT074-04 | As above, while lines are arriving | 1. Scroll up a few lines<br>2. Wait<br>3. Scroll back to the bottom<br>4. Press Hold, wait, press it again | Scrolling up stops the follow and the footer says so; returning to the bottom re-arms it. Hold freezes the list and counts what arrives; releasing catches up | P1 | |
| SWEEP-FEAT074-05 | Any farm | 1. Drag the drawer's top edge up and down<br>2. Double-click it<br>3. Collapse it with the chevron<br>4. Restart Spagitty | The drag is smooth and clamps; the double-click resets; the collapsed drawer keeps its tab bar; the height and the collapse survive a restart | P1 | |
| SWEEP-FEAT074-06 | A farm with tasks changing status | 1. Watch the task list while a task moves | The row washes with the accent for about a second and settles. Nothing jumps, and no row already being read moves | P2 | |
| SWEEP-FEAT074-07 | System setting "reduce motion" enabled | 1. Repeat 06, and open and close the drawer | Nothing animates: no wash, no line fade, no height transition | P2 | |
| SWEEP-FEAT074-08 | A farm from before this change (an `events.jsonl` written by 0.4.1-alpha) | 1. Open it and read the Activity tab | The old lines are there with no time rather than a 1970 timestamp; new lines are timed | P2 | |
| SWEEP-FEAT074-09 | Any farm with activity | 1. Press Copy<br>2. Paste somewhere | What was on screen, filter and all, arrives as text | P3 | |
| SWEEP-FEAT074-10 | Keyboard only | 1. Tab to the drawer's divider<br>2. Press Up and Down, then Home | The drawer resizes in steps and Home resets it. Arrow keys on a side panel's divider resize *that* panel, not the graph's detail panel | P2 | |
