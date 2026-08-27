<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-012 — A network request freezes the window

**Status:** Fixed. Plan: [`agile/plans/BUG-012-plan.md`](../plans/BUG-012-plan.md).
**Screen:** Pull requests (1H), Settings → Accounts and Updates (1K).

## What happened

With BUG-011 fixed, the application opened and then stopped responding, until
the compositor offered to kill it:

> **Application Not Responding** — An application Spagitty is not responding.
> What do you want to do with it? *Terminate / Wait*

## Why

Tauri runs a **synchronous** `#[tauri::command]` on the main thread. Every
command that talks to a network was synchronous:

- `pull_requests` — the whole GraphQL round trip.
- `forge_connect` — proving the token.
- `check_update` — and this one runs at startup.

`forge/http.rs` sets a thirty-second global timeout, on purpose, so a host that
accepts a connection and says nothing cannot hang a worker forever. It hangs the
*window* instead when the call is on the main thread — and on a machine with no
route out, that is thirty seconds of a frozen window before anything is drawn.

The timeout was doing its job. The thread it was running on was the defect.

## Why it was not caught

The same reason as BUG-011, and this is the more useful half: every network path
was tested against fixtures, and a fixture returns instantly. Nothing in the
suite could tell a request that blocks the main thread from one that does not,
because nothing in the suite made a request at all.

It is also invisible to the type system and to review — a `fn` and an `async fn`
look equally correct, and the difference is a sentence in Tauri's documentation
rather than anything in this repository.

## The fix

Every command that touches the network is `async` and hands the blocking work to
`tauri::async_runtime::spawn_blocking`, through one helper so the shape is the
same in all three and a fourth cannot quietly differ.

`pull_requests` reads the session, the account file and the keychain **first**,
synchronously, and only then goes off-thread — a lock must never be held across
an await, and all three of those are local and fast.

## Where it shipped

**`v0.1.0-preview.1` has this defect**, in `pull_requests` and `forge_connect`.
Anyone connecting an account on that build sees the window freeze for as long as
the host takes, or thirty seconds if it never answers.

## Dependencies

FEAT-017 and FEAT-054, which added the three commands.
