<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-012 — Plan

## Approach

A modal owned by the layout, a pure planner in the core, and a worker thread
that streams git's own progress. Three pieces, because the clone itself is the
only part that needs a process and it is the only part that can be cancelled.

- **`crates/gitlumiere-core/src/clone.rs`** — the destination a URL and a parent
  directory produce, what is wrong with it before anything runs, and a parser
  for git's progress lines. All of it pure or read-only.
- **`crates/gitlumiere-core/src/shell.rs`** — gains `clone_start`, which spawns
  `git clone --progress` and hands the caller the child.
- **`src-tauri/src/clone_worker.rs`** — one thread per clone: reads stderr,
  emits progress, reports the end. Cancelling kills the child.
- **`src/lib/clone/`** — the store and the modal.

## Decisions

**The clone goes through `git`, which is the whole point of the item.** It is
the first operation that needs credentials, and credential helpers are external
programs resolved through config with a documented protocol — the place OS
keychain integration already lives. `shell.rs` already says this; the clone is
the first caller that proves it.

**The destination is computed before it is created, and shown.** Criterion 2 is
not decoration: a clone that puts a repository somewhere other than where the
user was told is a repository they will not find again. `clone::plan` derives
the name from the URL the way `git clone` does — the last path segment, without
a trailing `.git` or slash — joins it to the chosen parent, and returns the
exact path. The modal shows that path, not a description of it.

**Refusal happens before the process starts.** An existing non-empty
destination, an unusable URL, a parent that is not a directory: each is a
`Problem` on the plan, and the button is disabled with the reason beside it.
Letting git fail and reporting its message would be simpler and worse — the
user finds out after a network round trip what they could have been told while
typing.

**An existing *empty* destination is allowed**, because `git clone` allows it.
Matching git's own rule here rather than inventing a stricter one is what makes
criterion 1 true.

**Progress is parsed, not invented.** `git clone --progress` writes phases to
stderr — counting, compressing, receiving, resolving — each with a percentage
and each terminated by `\r` rather than a newline. The parser is a pure
function over one line and is where the tests are. The worker's job is only to
split the stream and forward what the parser recognises; a line it does not
recognise is still shown, because git's own words are better than "working…".

**Cancelling removes only what the clone created.** Whether the destination
existed is decided *before* the process starts and remembered. If it did, the
directory is left exactly as it was found — the partial contents of a cancelled
clone inside a directory the user already had is not something GitLumiere may
delete. If it did not, the directory is removed after the child is confirmed
dead, and not before.

**A failed or cancelled clone touches nothing else.** The repository list is
written by `open_repo`, and the clone opens the result only on success — so
criterion 8 falls out of the existing design rather than needing a rule.

**The modal lives in the layout.** It is reachable from All repositories and
from the toolbar, and neither of those may own it: a modal owned by a screen
disappears when the screen navigates, which is exactly what a clone in progress
must not do.

**One clone at a time.** Starting a second while one runs is refused rather
than queued. Two clones is not a workflow anyone asked for, and the state it
would need — a list of running clones, each with its own progress — is more
machinery than the problem has.

## Files

- `crates/gitlumiere-core/src/clone.rs` — new; `shell.rs` gains `clone_start`;
  `lib.rs`
- `src-tauri/src/clone_worker.rs` — new; `commands.rs`, `lib.rs`
- `src/lib/types.ts`, `src/lib/api.ts`
- `src/lib/clone/store.svelte.ts`, `src/lib/clone/CloneModal.svelte` — new
- `src/routes/+layout.svelte` — mounts the modal
- `src/lib/chrome/Toolbar.svelte`, `src/routes/repos/+page.svelte` — open it
- `docs/screens.md`, `agile/testing/FEAT-012-*.md`

## Risks

- **A killed `git clone` can leave the destination behind.** The removal
  happens after the child is reaped, not after the kill signal, or the two race
  and the directory comes back.
- **Progress parsing is against a format git does not promise.** An unrecognised
  line is shown verbatim rather than dropped, so a format change degrades to
  "no percentage" instead of "no progress".
- **`GIT_TERMINAL_PROMPT=0` must survive.** `shell::clone_start` sets it like
  every other call: a clone that hangs on an invisible password prompt is the
  failure criterion 5 exists to prevent.
- **Cloning writes to a directory the user chose.** Nothing is written outside
  the destination, and nothing pre-existing is removed.

## Rollback

Revert the commit. The Clone modal disappears; every other screen is
untouched, since nothing existing changes behaviour — the toolbar and the
repositories screen only gain a button.
