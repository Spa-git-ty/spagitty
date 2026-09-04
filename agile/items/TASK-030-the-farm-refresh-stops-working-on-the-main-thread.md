<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-030 — The farm's refresh stops working on the main thread

**Status:** Done
**Branch:** `task/TASK-030-cheaper-farm-refresh`
**Screens:** Farm (1Q).

## Problem

The Farm screen refreshes after every burst of events. That is the right shape —
events keep the screen live, a snapshot keeps it right — but the snapshot itself
was expensive, and it was taken on the thread that paints the window.

Three costs, compounding:

1. **`farm_snapshot` ran `git worktree list --porcelain`.** The snapshot carried
   `stale`, the worktrees left behind by tasks no farm claims, and answering
   that means spawning `git`. A quarter of a second after every burst of events,
   for a list that cannot change while a farm is running.
2. **It re-read and re-parsed the event log.** `events()` was
   `store::load_events`, which reads `events.jsonl` and parses up to two
   thousand JSON objects. The cost of watching a farm was proportional to how
   much that farm had already done.
3. **Every transcript line restarted the refresh timer.** The listener called
   `scheduleRefresh()` for `agentOutput` events too. Those change nothing a
   snapshot would report, there are thousands of them in a run, and because the
   refresh is debounced, a chatty agent pushed the refresh that *did* matter
   past the end of its own run.

Separately, and found while reading for this: `docs/architecture.md` describes
the workspace as `src/ → src-tauri/ → crates/spagitty-core`. `crates/spagitty-farm`
has been in the tree since FEAT-073 and is not in that document at all — nor is
`src-tauri/src/farm.rs`, nor thirty commands. Amendment 11 makes that a defect
rather than an omission.

## Scope

- A snapshot no longer scans worktrees. Leftovers are their own command, asked
  for when the farm opens and after a sweep.
- The event history is held in memory, loaded from disk once when the farm
  opens and appended to as events are emitted. The file is still the record.
- A snapshot carries the tail of the history rather than all of it; a reader who
  wants more asks for more.
- A transcript line no longer schedules a refresh.
- `docs/architecture.md` describes the farm crate, its Tauri layer, and its
  commands.

## Non-scope

- The activity strip itself. Making the log worth reading is its own item; this
  one is about what the screen costs, not what it shows.
- The transcript files. They are already read as a bounded tail, on demand.

## Acceptance criteria

- Watching a run spawns no `git` process per refresh.
- The in-memory history and the file agree, and a reopened farm reads its
  history back.
- A transcript line updates the pane and asks the backend for nothing.
- `docs/architecture.md` names every farm command that is registered, and no
  command that is not.
