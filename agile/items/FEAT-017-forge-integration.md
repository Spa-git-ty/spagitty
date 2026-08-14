<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-017 — Forge integration

**Status:** Backlog. No plan yet; one is written when the work starts.
**Screen:** Pull requests (1H), Settings → Accounts (1K).

## Problem

FEAT-010 builds the Pull requests screen with no data behind it, and FEAT-011
builds an Accounts section that connects nothing. Neither can show a real pull
request.

## Why it was deferred

The author's decision. It is a subsystem, not a screen: an HTTP client, at least
two incompatible REST APIs, token storage in the OS keychain, rate limiting,
offline behaviour, and a new class of failure the rest of GitLord does not have.
Deciding it separately keeps it from being designed by accident inside a screen.

## Scope when started

- Connecting an account per host, with the token in the OS keychain and never
  in a config file.
- Reading pull requests into the shape FEAT-010 already renders.
- Review state, checks and draft status.
- Offline and rate-limited behaviour that says which one it is.

## Open questions for the author

- Which hosts, and in what order.
- Whether to talk to the APIs directly or to reuse an already-authenticated
  host CLI, which avoids storing a token at all.
- Whether writes — approving, merging — are ever in scope, or whether GitLord
  stays read-only against a forge.

## Notes for whoever picks this up

- The vocabulary stays host-agnostic in the UI whatever the backend is; that is
  a design rule of the project, not a detail of this item.
- Anything that leaves the machine is a privacy surface. The All repositories
  screen already promises that repositories are read from disk and nothing is
  uploaded; that promise must survive this item.

## Dependencies

FEAT-010, FEAT-011.
