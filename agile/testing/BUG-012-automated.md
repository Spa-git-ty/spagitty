<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-012 — Automated tests

**Item:** [`agile/items/BUG-012-network-freezes-the-window.md`](../items/BUG-012-network-freezes-the-window.md)
**Plan:** [`agile/plans/BUG-012-plan.md`](../plans/BUG-012-plan.md)

**None, and that is the honest answer rather than a gap being hidden.**

What was wrong is which thread a command runs on. That is a property of Tauri's
command dispatch — a synchronous `#[tauri::command]` runs on the main thread and
an `async` one does not — and it is decided outside this repository. TASK-003
made the Tauri layer constructible under a mock runtime, which gives an
`AppHandle`; it does not give the dispatcher, so the suite cannot observe which
thread a command would have been called on.

A test could assert the commands are declared `async`, by reading the source. It
would pass for a command that was `async` and then blocked anyway, and fail for
a future fix that solved it another way. It would pin the current shape rather
than the property that matters, so it was not written.

`SWEEP-012-01` is the check, and it is a real one: point the host at something
that accepts a connection and never answers, and see whether the window still
moves.

## What did change in the suite

Nothing. Both of the day's bugs were found by running the application, and the
conclusion recorded in the plan is not "add network tests" — it is that the
manual sweeps for anything touching a network are the only cover the transport
has, and they belong before a release.
