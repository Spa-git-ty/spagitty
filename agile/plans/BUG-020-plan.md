<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-020 — Plan

**Item:** [`agile/items/BUG-020-the-window-freezes-while-the-farm-plans.md`](../items/BUG-020-the-window-freezes-while-the-farm-plans.md)

## Approach

Two changes, one per fault.

**Take the session out of the map on its own line.** `collect_plan`,
`cancel_task` and `cancel_farm` each bind the removed session to a local before
the `if let`, so the guard is dropped at the end of that `let` statement and the
wait, the cancel and the `Session` drop all happen with nothing held. This is
the shape `await_task` already uses, and the comment at `collect_plan` says why
the two shapes are not interchangeable, because the difference is invisible at a
glance and this is the second thing in the file that has to get it right.

Deliberately not clever: no `parking_lot`, no restructuring of the session map,
no `drop(guard)` call. A `drop()` would work and would be one line shorter, but
it is a line whose deletion silently reintroduces this bug, and nothing would
fail. Binding the value first cannot be undone by deletion.

**Every farm command becomes `#[tauri::command(async)]`.** They stay synchronous
functions — an `async fn` may not borrow `State`, and there is nothing to await
— but Tauri now runs them on its runtime rather than on the main thread. This is
belt and braces on top of the lock fix, and it is the part that generalises: the
farm's commands read files, spawn `git`, and take locks that other threads hold,
and none of that belongs on the thread that paints the window.

Applied to all twenty-seven rather than to the five that provably block. A rule
that says "the farm's commands do not run on the main thread" survives a new
command being added; a list of five does not.

## Alternatives considered

**A lock-free session map (`DashMap`, or a channel per run).** A dependency and
a rewrite for a bug whose cause is two tokens of syntax. The map is not
contended in any interesting way — it holds at most eight entries and is touched
on task transitions.

**Keeping the commands blocking and auditing them for waits.** That is the
regime that produced the bug: `collect_plan` was already documented as returning
immediately, and it did. What blocked was a *different* command, taking a lock
this one held. Auditing cannot see that, and the audit has to be repeated for
every command anyone adds.

**Splitting `sessions` into one mutex per task.** Removes this contention and
adds the deadlock the crate's header explicitly chose one mutex to avoid.

## Files

| File | Change |
| --- | --- |
| `crates/spagitty-farm/src/service.rs` | Bind before `if let` in `collect_plan`, `cancel_task`, `cancel_farm`. |
| `src-tauri/src/farm.rs` | All commands `(async)`; header records why. |
| `crates/spagitty-farm/tests/pipeline.rs` | `Harness::service` behind an `Arc`; the regression test. |

## Risks and rollback

- **A command that now runs off the main thread and needed to be on it.** None
  of them touch a window or a menu; they forward to the service and emit. Tauri
  events are already emitted from worker threads all over this application.
- **The regression test's two-second sleep.** It is the cost of proving a lock
  is not held; there is no way to observe absence instantly. The suite runs in
  about two seconds and now takes about four.
- **Rollback** is the revert of one commit; nothing here changes stored state,
  the event schema, or any interface the front end calls.
