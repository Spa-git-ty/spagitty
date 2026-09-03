<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-020 — The window freezes while the farm plans

**Status:** Fixed, awaiting sweep
**Branch:** `bugfix/BUG-020-freeze-while-planning`
**Screens:** Farm (1Q), and the whole window with it.

## Problem

Start a farm, ask an agent to plan, and Spagitty stops responding. Not the Farm
screen — the window: the tab strip, the rail, the menus, everything. It comes
back at the exact moment the planner finishes and its tasks appear.

**Two faults, and the second is what makes the first fatal.**

`FarmService::collect_plan` took the planning session out of the map like this:

```rust
if let Some(session) = self.sessions.lock().expect("sessions lock").remove(&planning_task) {
    session.wait();
}
```

The mutex guard is a temporary of the `if let` scrutinee, and on edition 2021 a
scrutinee temporary lives until the end of the `if let` — body included. So
`session.wait()`, which is the whole planning run, ran with the `sessions` mutex
held. `await_task` a few lines above has always used `let ... else`, where the
temporary is dropped at the end of the `let` statement, and does not have the
fault; the two shapes look alike and behave completely differently.

Everything that starts, stops or schedules a task takes that same lock:
`start_task` through `tick`, `run_task`, `cancel_task`, `cancel_farm`. So did
pressing Stop — the one control a person reaches for when the window has stopped
responding.

Second, every farm command was a plain `#[tauri::command]`. Tauri compiles that
as `ExecutionContext::Blocking` and runs it on the main thread. A command that
blocks there does not block the Farm screen, it blocks the event loop — which is
why the whole application went with it, and why the same bug in a background
thread would have been invisible.

`cancel_task` and `cancel_farm` carried the same `if let` shape. Their bodies
only signal the child, but the guard also outlives the `Session` value, whose
`Drop` joins the reader threads and reaps the process — so cancelling held the
lock for however long the agent's children took to die.

## Reproduction

1. Open a repository with the Farm screen and a detected agent.
2. Type a goal, start a farm, press **Plan it**.
3. While the planner is running, try to do anything at all — switch pane, open
   the repository menu, drag the window.

**Observed:** nothing responds until the planner finishes, typically minutes.
**Expected:** the planner runs in the background; the window stays live and the
plan arrives as events.

**Environment:** every platform. It is a lock held across a wait, not a
platform behaviour.

## Scope

- The `sessions` lock is never held across a wait, a cancel, or a `Session`
  drop.
- Farm commands run off the main thread.
- A test fails without the fix.

## Non-scope

- The absence of any *feedback* during a planning run. The run says nothing
  until it ends, and the planning transcript is filed under a task id no screen
  renders. That is a defect of its own and gets its own item.
- The cost of the snapshot refresh — a `git worktree list` and a two-thousand
  line log re-read every quarter second. Also a main-thread problem, also its
  own item.

## Acceptance criteria

- With a planning run in flight, a command that needs the `sessions` lock
  answers immediately rather than when the run ends.
- Stop works during a planning run.
- The window paints, and every other screen stays usable, while a farm plans.
- Planning still adopts its tasks as drafts, exactly as before.
