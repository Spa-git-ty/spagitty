<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-020 — Show the git command behind each action

**Status:** Backlog. No plan yet; one is written when the work starts.
**Screen:** every screen that writes; the toggle is on Settings (1K).

## Problem

FEAT-011 added a "Show the git command behind each action" toggle. It persists,
and nothing reads it: no action reports what it did, so the switch changes
nothing.

## Why it was deferred

The honest version of this feature is not a label — it is a record of what
GitLord actually ran, which means the reporting has to come from the place that
runs it rather than from each screen guessing. `shell.rs` is the only module
that spawns a process, so it is the only place that knows, and threading that
back out to the UI is a design decision rather than a string.

## Scope when started

- A record of each executed command, produced by `crates/gitlord-core/src/shell.rs`
  itself, so a screen cannot claim a command that was never run.
- A place to read it: a log the toggle reveals, rather than a toast that is gone
  before it is read.
- The `gix` half stated honestly. Most of what GitLord does — every read — is
  in-process and has no command line, and pretending otherwise would teach the
  user a `git` invocation GitLord never made.
- Redaction of anything that must not be shown: a URL with credentials in it is
  a plausible argument to a fetch.

## Non-scope

- Editing or re-running a command from the log. Reading what happened and
  driving the application from a console are different features.

## Notes for whoever picks this up

- The value here is teaching: someone learning git can see the command a button
  corresponds to. That makes accuracy the whole point, and a rendered
  approximation worse than nothing.
- `shell::run` already builds the argument vector; the exact same slice is what
  should be recorded, not a re-derivation of it.

## Dependencies

FEAT-011 (the toggle).
