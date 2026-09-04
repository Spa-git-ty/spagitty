<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-030 — Manual sweep

**Item:** [`agile/items/TASK-030-the-farm-refresh-stops-working-on-the-main-thread.md`](../items/TASK-030-the-farm-refresh-stops-working-on-the-main-thread.md)

## Sweep tickets

| Ticket | Preconditions | Steps | Expected result | Priority | Result |
| --- | --- | --- | --- | --- | --- |
| SWEEP-TASK030-01 | A farm running a real task that produces a lot of output | 1. Watch the Farm screen for a minute<br>2. Scroll the task list and switch panes while it runs | The screen stays smooth; no periodic hitch as output arrives | P1 | |
| SWEEP-TASK030-02 | As above | 1. In a terminal, run `ps -ef \| grep 'git worktree list'` repeatedly, or watch `Show the git command behind each action` | No `git worktree list` while the run is in flight | P1 | |
| SWEEP-TASK030-03 | A repository with a farm that has been used before | 1. Open it<br>2. Read the activity strip | The history from previous sessions is there — the in-memory history is loaded from the log on open | P1 | |
| SWEEP-TASK030-04 | A farm with a worktree left behind (delete a task that has one) | 1. Open Settings<br>2. Press **Clean up** | The leftovers count is right when the pane opens, and the list is re-read after the sweep rather than staying stale | P1 | |
| SWEEP-TASK030-05 | Any repository | 1. Open `docs/architecture.md`<br>2. Compare the farm command list against `src-tauri/src/lib.rs` | Every registered farm command is listed, and nothing is listed that is not registered | P2 | |
