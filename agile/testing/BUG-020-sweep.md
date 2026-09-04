<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-020 — Manual sweep

**Item:** [`agile/items/BUG-020-the-window-freezes-while-the-farm-plans.md`](../items/BUG-020-the-window-freezes-while-the-farm-plans.md)

The point of this sweep is the event loop. The automated test proves the lock is
free; only a person can say whether the window is alive.

A **slow scripted agent** makes every ticket below deterministic and costs
nothing: in Farm → Agents → Add a custom agent, set the executable to `/bin/sh`
and the extra arguments to `-c`, then
`sleep 45; echo '```spagitty-plan'; echo '{"tasks":[{"reference":"t1","title":"Slow plan"}]}'; echo '```'`,
then `slow`, then `{prompt}`. It behaves like a planner that thinks for
forty-five seconds. Tickets that must be run against a real agent say so.

## Sweep tickets

| Ticket | Preconditions | Steps | Expected result | Priority | Result |
| --- | --- | --- | --- | --- | --- |
| SWEEP-BUG020-01 | A repository is open; the slow scripted agent is registered; a farm exists with a goal | 1. Press **Plan it**<br>2. While it runs, switch the Farm pane between Tasks, Agents and Settings<br>3. Open the repository menu, then the tab strip's `+`<br>4. Drag the window and resize it | Every one of them responds immediately. The farm status chip reads Planning throughout, and the plan's task appears when the script finishes | P1 | |
| SWEEP-BUG020-02 | As above, a planning run in flight | 1. Press **Stop** on a task, or Cancel on the farm | The cancel takes effect at once; it does not wait for the planning run | P1 | |
| SWEEP-BUG020-03 | As above, a planning run in flight | 1. Leave the Farm screen for the Graph<br>2. Scroll the history, open a commit, open a diff | The Graph behaves exactly as it does with no farm running | P1 | |
| SWEEP-BUG020-04 | A repository is open; a **real** agent (Claude Code, Codex, Cursor or Oh My Pi) is detected; a farm exists | 1. Press **Plan it** and wait for the real planner to finish | The window stays live for the whole run; tasks arrive as drafts at the end | P1 | |
| SWEEP-BUG020-05 | A farm with at least two ready tasks and a real agent | 1. Start the farm<br>2. While a task is running, add a task, edit one, and delete a third | Each action completes without a pause; nothing waits on the running agent | P2 | |
| SWEEP-BUG020-06 | A farm with a task running under the slow scripted agent | 1. Press **Stop**<br>2. Immediately press it again, and switch panes | Stop returns at once both times; the task reaches Cancelled; no freeze while the child is reaped | P2 | |
| SWEEP-BUG020-07 | Any farm | 1. Close the repository while a run is in flight<br>2. Reopen it | Closing is immediate; reopening shows the farm with the run still recorded | P3 | |
