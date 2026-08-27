<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-012 — Plan

**Item:** [`agile/items/BUG-012-network-freezes-the-window.md`](../items/BUG-012-network-freezes-the-window.md)
**Branch:** `feature/FEAT-019-commit-signing`
**Status:** fixed.

## The fix

`check_update`, `pull_requests` and `forge_connect` are `async`, and each hands
its blocking work to `tauri::async_runtime::spawn_blocking` through one helper,
`off_thread`. One helper rather than three call sites so the shape is identical
in all of them and a fourth command cannot quietly differ.

The helper keeps the crate's own error type and turns a join failure into one,
rather than swallowing it: a panic inside means a bug, and a command that
returned nothing would hide it.

### Order matters in `pull_requests`

It reads the open session, the accounts file and the keychain **synchronously**,
and only then goes off-thread. Two reasons, and the first is a compile error
waiting to happen: reading the session takes a `Mutex` guard, and a guard must
never be held across an await. The second is that all three reads are local and
finish immediately — there is nothing to gain by moving them and a lock to lose.

## Why the timeout was not the problem

`forge/http.rs` sets a thirty-second global timeout so a host that accepts a
connection and then says nothing cannot hang a worker forever. That is right and
it stays. On the main thread it hangs the *window* instead — the timeout was
doing its job on the wrong thread.

## What is not covered by a test

That these run off the main thread. It is a property of Tauri's dispatch, not of
this code, and the suite does not run a Tauri application — TASK-003 made the
layer testable under a mock runtime, which gives an `AppHandle` but not the
command dispatcher's threading.

`SWEEP-012-01` is the check: the window stays interactive while a request is in
flight, and the way to see it is to point the host at something that never
answers.

## The wider lesson, recorded rather than left implied

Two bugs, found within a minute of each other, both by running the application
and neither by any test. They are the same gap seen twice: every network path in
this project is tested against fixtures, and a fixture returns instantly on
whatever thread asked. That shape is deliberate and stays. What follows from it
is that the manual sweeps for anything touching a network are not optional
polish — they are the only thing covering the transport, and they belong before
a release rather than after one.
