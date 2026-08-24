<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-020 — Show the git command behind each action

**Status:** Done. Plan in `agile/plans/FEAT-020-plan.md`, tests in
`agile/testing/FEAT-020-automated.md` and `agile/testing/FEAT-020-sweep.md`.
Branch `feature/FEAT-020-show-git-commands`, cut from FEAT-022's tip because the
operations it records were added there.
**Screen:** every screen that writes; the toggle is on Settings (1K), and the
panel is opened from the toolbar or the command palette.

## Problem

FEAT-011 added a "Show the git command behind each action" toggle. It persists,
and nothing reads it: no action reports what it did, so the switch changes
nothing.

## Why it was deferred

The honest version of this feature is not a label — it is a record of what
Spagitty actually ran, which means the reporting has to come from the place that
runs it rather than from each screen guessing. `shell.rs` is the only module
that spawns a process, so it is the only place that knows, and threading that
back out to the UI is a design decision rather than a string.

## Scope when started

- A record of each executed command, produced by `crates/spagitty-core/src/shell.rs`
  itself, so a screen cannot claim a command that was never run.
- A place to read it: a log the toggle reveals, rather than a toast that is gone
  before it is read.
- The `gix` half stated honestly. Most of what Spagitty does — every read — is
  in-process and has no command line, and pretending otherwise would teach the
  user a `git` invocation Spagitty never made.
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

## What was built

- `crates/spagitty-core/src/record.rs` — a process-wide ring buffer of the last
  200 executions (argv, outcome, exit code, duration), written by `shell.rs`
  itself. Every spawn now goes through `shell::finish` or `shell::record_spawn`,
  so a spawn added later cannot bypass the record.
- Credentials in a URL are stripped **on the way into** the buffer
  (`record::redact`), never on the way out, so an entry never holds the secret.
- A clone is recorded at spawn as `started`: nothing waits for it, and a record
  that waited would appear minutes after the user asked what was running.
- `src-tauri/src/command_log.rs` forwards each entry as the `git-command` event;
  `git_commands(since)` is the catch-up read.
- `src/lib/commandlog/` — the store and the drawer, mounted once by the shell,
  reached from a toolbar button and the palette, both gated on the toggle.
- The shell now reads the settings on start. Until this change the toggles were
  read only when the Settings screen mounted, so anything else consulting them —
  including the confirmation before a history rewrite — answered from the
  defaults.

## Acceptance criteria

1. With the toggle off, nothing about the app changes and the panel cannot be
   reached. ✔
2. With it on, a Commands button appears and lists what has run this session,
   including what ran before the toggle was flipped. ✔
3. The line shown is the command as spawned, with the flags the shell layer
   added — `git fetch --prune --progress --all`, not `git fetch`. ✔
4. A failed command shows its exit code and git's own stderr. ✔
5. A clone's URL never shows its credentials. ✔
6. The panel states that reads are answered in-process and run no command. ✔
7. Reading history, refs, diffs or status produces no entries. ✔

## Not built, deliberately

- Re-running or editing a command from the log (non-scope, above).
- Persisting the log across restarts: this is a window on the current session.
- A *predicted* command shown before an action runs. That is a different claim
  from a record of what ran, and would need its own item.
