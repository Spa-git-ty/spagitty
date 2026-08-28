<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-020 — Plan

## Context

FEAT-011 shipped a Settings toggle, "Show the git command behind each action"
(`showGitCommands`). It persisted and nothing read it: flipping it changed
nothing anywhere in the application.

The honest version of the feature is not a label beside a button. Spagitty runs
`git` from exactly one module — `crates/spagitty-core/src/shell.rs`, whose header
declares it is "the **only** place in Spagitty that spawns a process" — and
everything else is in-process `gix` with no command line at all. The record has
to be produced by the thing that spawns, not by each screen describing what it
believes it asked for: a screen would not know that a fetch carries
`--prune --progress`, that a force push is `--force-with-lease`, or that
reverting a merge gained `-m 1` on the way down.

FEAT-022 had just added thirteen write operations reachable from the graph,
several destructive, which is what made this worth doing next: a user who cannot
see that "Reset here (hard)" ran `git reset --hard <sha>` has no way to check
Spagitty against their own understanding of git.

## Architecture decision

**The record lives in the core, beside the spawn site, and knows nothing about
the UI.** `crates/spagitty-core/src/record.rs` holds a process-wide ring buffer
of the last 200 executions plus one optional observer. `shell.rs` writes to it;
`src-tauri` registers the observer and forwards entries as an event.

Alternatives considered and rejected:

| Alternative | Why not |
| --- | --- |
| Each screen reports the command it invoked | It reports a *request*, not an execution. Wrong by construction the moment the shell layer adds a flag, and it can claim a command that never ran. |
| Return the record from every `shell` function | Changes fourteen signatures and every caller, to carry a value almost none of them want. |
| Have the core emit Tauri events directly | Puts the UI framework inside the layer whose whole rule is that it has none. |
| Poll from the webview | The panel is most useful *while* a fetch or a clone is running, which is exactly when polling is worst. |

**The buffer is the source of truth; the event is a notification.** A dropped
event costs latency, not data, because `git_commands(since)` reads the buffer.
That is why `emit`'s result is discarded here exactly as it is in the workers.

**Redaction happens on the way in.** A clone URL can carry a live token, so
`record::redact` strips userinfo before the entry is stored. Doing it at display
time would leave the secret in memory for a copy button, an export, or a later
reader who assumes display is doing the work.

## Files

| File | Change |
| --- | --- |
| `crates/spagitty-core/src/record.rs` | New. Buffer, `Executed`, `Outcome`, `redact`, `observe`, `recent`, `clear`. |
| `crates/spagitty-core/src/shell.rs` | All four spawns funnelled through `command` + `finish` / `record_spawn`. |
| `crates/spagitty-core/src/lib.rs` | Registers the module; header states where the record comes from. |
| `src-tauri/src/command_log.rs` | New. Registers the observer, emits `git-command`. |
| `src-tauri/src/commands.rs` | `git_commands(since)`, `clear_git_commands`. |
| `src-tauri/src/lib.rs` | `setup` registers the observer before any command can run. |
| `src/lib/types.ts`, `src/lib/api.ts` | Wire types and the two invokes. |
| `src/lib/commandlog/` | New. Store and drawer. |
| `src/routes/+layout.svelte` | Mounts the drawer, attaches the listener, reads the settings on start. |
| `src/lib/chrome/Toolbar.svelte`, `src/lib/palette/commands.ts` | The two ways in, both gated on the toggle. |
| `src/lib/settings/BehaviourSection.svelte` | The toggle stops saying it is pending. |

## Ordered steps

1. `record.rs` with its tests, then funnel `shell.rs`'s spawns through it.
2. Tauri commands and the observer.
3. Frontend types, API, store, panel.
4. Mount, gate the two entry points, and read the settings from the shell.
5. Tests at both layers; docs and records.

## Risks

- **A spawn that skips the record.** Mitigated structurally: `run`,
  `run_with_stdin`, `rebase_interactive` and `clone_start` all go through the
  same two helpers, and a new spawn has to be written past them deliberately.
- **Recording on the hot path.** The observer runs inside the operation the user
  is waiting for, so it does nothing but emit. The buffer write is a mutex and a
  clone of one small struct, against a process spawn that already cost
  milliseconds.
- **Secrets.** Covered above, and tested against a URL with a token in it.
- **A lock poisoned by an unrelated panic.** Recording is a convenience; a
  poisoned lock is ignored rather than propagated, because the operation the
  user asked for has already happened.

## Rollback

The feature is additive and gated. Turning the toggle off restores the previous
behaviour exactly; reverting the commit removes the module, the two commands and
the panel, and `shell.rs` returns to spawning inline.
