<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-018 — Fetch and push

**Status:** Partial. The buttons are live and the plumbing is complete, but
three of the five things this item scoped were never built — see **What
actually shipped** below. TASK-012 read this as `Done` from the live buttons;
TASK-013 read the code and found the rest. The problem statement below still
describes the tree as it was before any of it existed.
**Surface:** the toolbar's Fetch and Push buttons, and the Branches screen's
ahead/behind counts.

## Problem

The toolbar's Fetch and Push buttons carry a "Not built yet" tooltip.
`shell::fetch` and `shell::push` are `unimplemented!()` stubs. Every ahead and
behind count in Spagitty is therefore as old as the last fetch someone ran from a
terminal.

## Why it was deferred

Both are network operations needing credential helpers, and push is the first
thing Spagitty would do that other people can see. Neither belongs inside another
screen's item.

## What actually shipped

Recorded by TASK-013, from the code rather than from the record.

**Built**, across `994dbe9` (the plumbing) and `b71f8aa` (the live buttons):

- `shell::fetch` and `shell::push` are real, not `unimplemented!()`, and go
  through `shell.rs` for the reason its header gives.
- The `fetch` and `push` commands, `api.fetch(remote)`, `api.push(remote,
  refspec, force)`, and `actions.fetchAll` / `actions.pushCurrent` behind the
  toolbar's two buttons.
- Failures arrive as sentences: `perform` reports git's own message and does not
  re-read on failure.
- `push --force-with-lease`, never a plain force — the parameter exists in every
  layer and no interface offers it, which is deliberate.

**Not built**, and still owed by this item:

- **Per-remote fetch.** Every layer takes a remote; the button always sends the
  empty string, which means all remotes.
- **Pruning as an explicit choice.** `shell::fetch` always passes `--prune`. The
  item's own notes say pruning deletes remote-tracking refs and is destructive in
  the sense Amendment 6 means — so it currently happens silently, which is the
  opposite of what was asked for. This is the gap worth closing first.
- **Setting an upstream on first push.** A branch with no upstream fails with
  git's message rather than being offered `--set-upstream`.
- **Progress.** Output arrives when the process ends; `--progress` is passed but
  nothing streams it.
- **The Branches screen saying how stale its counts are.** It refreshes after a
  fetch, because everything re-reads, but it never says how old the numbers are.

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
