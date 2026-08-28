<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-017 — Forge integration

**Status:** Done. Plan: [`agile/plans/FEAT-017-plan.md`](../plans/FEAT-017-plan.md).
**Screen:** Pull requests (1H), Settings → Accounts (1K).

## Problem

FEAT-010 builds the Pull requests screen with no data behind it, and FEAT-011
builds an Accounts section that connects nothing. Neither can show a real pull
request.

## Why it was deferred

The author's decision. It is a subsystem, not a screen: an HTTP client, at least
two incompatible REST APIs, token storage in the OS keychain, rate limiting,
offline behaviour, and a new class of failure the rest of Spagitty does not have.
Deciding it separately keeps it from being designed by accident inside a screen.

## Scope when started

- Connecting an account per host, with the token in the OS keychain and never
  in a config file.
- Reading pull requests into the shape FEAT-010 already renders.
- Review state, checks and draft status.
- Offline and rate-limited behaviour that says which one it is.

## Open questions for the author — answered

- **Which hosts, and in what order.** GitHub first, behind an enum with one arm.
  A second host is a second module and a second arm; nothing above that line
  changes. GitLab is not written.
- **Direct API, or reuse an already-authenticated host CLI.** Direct. Reusing
  `gh` would avoid storing a token, but it makes the feature work only for
  people who have installed and logged into a separate program, and it makes
  every failure somebody else's error message.
- **Whether writes are ever in scope.** No. Read-only, decided rather than
  deferred — the smallest privacy surface that still answers the question the
  screen asks.

And the one the roadmap added: **which language owns the HTTP client.** The Rust
core. The webview keeps its promise of having no way to make a request, and the
token never crosses into JavaScript where a devtools network tab would show it.

## Notes for whoever picks this up

- The vocabulary stays host-agnostic in the UI whatever the backend is; that is
  a design rule of the project, not a detail of this item.
- Anything that leaves the machine is a privacy surface. The All repositories
  screen already promises that repositories are read from disk and nothing is
  uploaded; that promise must survive this item.

## Dependencies

FEAT-010, FEAT-011.

## How it was closed

`ureq` with native TLS — the platform's own certificate store, so a corporate
proxy with a custom root works without being told about it — reached from
exactly one file, `forge/http.rs`, with a test that walks the crate to keep it
that way.

One GraphQL request per refresh. REST would have needed one call plus three per
pull request for the line counts, the review decision and the checks: ninety-one
requests for thirty open ones, against a budget shared with everything else the
token does.

A personal access token rather than OAuth, because a client secret shipped
inside a GPL binary is a client secret anybody can read. The login is read back
from the host rather than typed. The token goes to the OS keychain keyed by host
and login; `accounts.json` holds a host and a login and there is a test that
fails if a token field is ever added to it.

Four failures rather than one — offline, rate limited and when it ends, refused,
and no account for this host — because they are four different decisions for the
reader, and GitHub answers a spent rate limit and a permission problem with the
same status.

The test that forbade an HTTP client became a narrower one: exactly one client,
only in `spagitty-core`, only reachable from `forge/http.rs`, and none in the
webview or the Tauri layer.

## What the privacy promise says now

It narrowed, and the wording was changed rather than left to become false.
Repositories are still read from disk and none is uploaded. What leaves the
machine is one request to a host the user connected themselves, carrying a token
they issued, asking for pull requests they can already see in a browser — no
repository contents, no paths, no commit messages, no telemetry. SWEEP-017-07
checks it with a proxy.
