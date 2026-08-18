<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-003 — Make the Tauri layer generic over `Runtime`

**Status:** Backlog. No plan yet; one is written when the work starts.

## Problem

Everything in `src-tauri` that touches the app takes a concrete
`tauri::AppHandle`, which is bound to the Wry runtime. `tauri::test::mock_app`
supplies an `AppHandle<MockRuntime>`, so none of it can be constructed in a
test:

- `graph_worker::spawn` and its `run` loop — the windowing and backpressure
  that the whole streaming design rests on.
- `watch::watch` and `debounce` — the coalescing that stops a commit from
  refreshing the UI four times.
- Every `#[tauri::command]` in `commands.rs`, and the session they share.

The pure parts of `watch.rs` are tested (TASK-002 covers `classify` and
`is_change`, which are the load-bearing filter). Everything above is not.

## Why it was deferred

Discovered while writing TASK-002. Fixing it means changing the signature of
almost every function in `src-tauri` — `pub fn watch<R: Runtime>(app:
AppHandle<R>, …)` and so on down. That is a behaviour-preserving refactor, but
it is a refactor, and TASK-002 was explicitly a testing item. Adding it there
would have made the change hard to review and impossible to revert on its own.

## Scope when started

- `commands.rs`, `graph_worker.rs`, `watch.rs` and `lib.rs` made generic over
  `R: tauri::Runtime`.
- `tauri = { features = ["test"] }` as a dev-dependency.
- Tests for what that unlocks, in order of what can actually be wrong:
  - The worker delivers exactly the number of rows asked for, then blocks.
  - A second `More` resumes the walk where it stopped rather than restarting.
  - Batches go out at `BATCH` rows, and a partial batch is flushed before the
    worker sleeps — otherwise the tail of a request is invisible until the next
    scroll.
  - `Stop` ends the walk and the `done` event reports `complete: false`.
  - A zero-row request does not start a walk and does not underflow the budget.
  - The debounce coalesces a burst into one event and emits nothing for a burst
    that classifies as empty.
  - `open_repo` replaces a previous session, and dropping it joins both threads.
  - Commands against no open repository return `NoRepository`.
  - `graph_request` with a stale token is ignored rather than failing.

## Notes for whoever picks this up

- This is the standard Tauri pattern; the generic parameter is inferred at every
  call site, so `lib.rs` is the only place that names the concrete runtime.
- No behaviour changes. If a test written afterwards fails, that is a bug this
  item found, not a bug it caused — record it as its own `BUG-###`.

## Dependencies

TASK-002 (which established the coverage measurement this would improve).
