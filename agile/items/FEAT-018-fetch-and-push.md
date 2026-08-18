<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-018 — Fetch and push

**Status:** Done — it landed inside FEAT-038 (`b71f8aa`) without this item
being closed at the time. `ops::fetch` and `ops::push` are implemented, the
commands exist, and the toolbar buttons are live. Corrected by TASK-012;
the problem statement below still describes the tree as it was before.
**Surface:** the toolbar's Fetch and Push buttons, and the Branches screen's
ahead/behind counts.

## Problem

The toolbar's Fetch and Push buttons carry a "Not built yet" tooltip.
`shell::fetch` and `shell::push` are `unimplemented!()` stubs. Every ahead and
behind count in GitLumiere is therefore as old as the last fetch someone ran from a
terminal.

## Why it was deferred

Both are network operations needing credential helpers, and push is the first
thing GitLumiere would do that other people can see. Neither belongs inside another
screen's item.

## Scope when started

- Fetch, per remote and for all remotes, with pruning as an explicit choice.
- Push, including setting an upstream on first push.
- Progress and failure surfaced from git's own output.
- The Branches screen saying how stale its counts are, and refreshing them after
  a fetch.

## Notes for whoever picks this up

- Both go through `shell.rs` for the reason its header already gives:
  credential helpers are external programs, and `pre-push` hooks must run.
- Force-push is not in this item and should not be added to it quietly. It
  destroys other people's work, not just the user's.
- `GIT_TERMINAL_PROMPT=0` means a missing credential fails instead of hanging;
  the failure has to become a sentence the user can act on.
- Pruning deletes remote-tracking refs. That makes it destructive in the sense
  Amendment 6 means, and it needs the same treatment as the other destructive
  items.

## Dependencies

FEAT-004 (ahead/behind), and the toolbar from FEAT-001.
