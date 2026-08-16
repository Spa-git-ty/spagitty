<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-010 — Pull requests (1H)

**Status:** Done.
**Branch:** `feature/FEAT-010-pull-requests`.
**Route:** `/requests`. **Rail:** "Pull requests".

## Problem

The rail has a Pull requests entry pointing at a placeholder. Nothing in GitLord
talks to a hosting service, and by the author's decision nothing will in this
pass.

## Motivation

The screen is still worth building now, for two reasons. The layout — needs you
above waiting on others — is part of the design and shapes the rail. And an
honest empty state that names what is missing and where to fix it is more useful
than a placeholder that says "not built yet", because it tells the user the
screen works and the account does not.

## Scope

- The real layout: a "Needs you" section above a "Waiting on others" section,
  and the detail panel beside them.
- An empty state explaining that no account is connected, pointing at
  Settings → Accounts.
- Host-agnostic vocabulary throughout — "pull request", never a host's brand.
- The data shape the screen will render once a host is connected, defined and
  documented, so FEAT-017 fills it in rather than redesigning the screen.

## Non-scope

- Any network call. No HTTP client, no dependency, no token.
- Storing credentials.
- Creating, reviewing, approving or merging a pull request.

All of the above is FEAT-017.

## Acceptance criteria

1. With no account connected — the only state reachable in this pass — the
   screen explains that plainly and links to Settings → Accounts.
2. No network request is made. Verified by the absence of any HTTP dependency in
   the manifests and by the screen working with networking disabled.
3. The layout matches the design: solid rows for what needs you, dashed rows for
   what is waiting on others, detail panel to the side.
4. The vocabulary is host-agnostic; no host name appears in any label.
5. The rail entry no longer reaches a `ScreenStub`.

## Dependencies

None. FEAT-017 depends on this one.
