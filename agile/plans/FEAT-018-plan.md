<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-018 — Plan

**Item:** [`agile/items/FEAT-018-fetch-and-push.md`](../items/FEAT-018-fetch-and-push.md)
**Branches:** none of its own. The plumbing landed in `994dbe9`, the live
buttons in `b71f8aa` on `feature/FEAT-038-pull`.
**Status:** partly implemented. This plan is **backfilled by TASK-013** and
covers both halves: what was built, and what the item still owes.

*A plan written after the fact is a reconstruction, and this one says which
parts are which. What shipped is read from the code; why it shipped that way is
read from the code's own comments and from the commit messages, and is marked
where it is inference rather than record.*

## What was built, and why that way

### Through `shell.rs`, not `gix`

Both operations spawn `git`. `shell.rs`'s header gives the reason and this item's
notes repeat it: credential helpers are external programs, and `pre-push` hooks
must run. A library implementation would silently skip both.

### `--prune` always, `--force-with-lease` always

`shell::fetch` passes `--prune` unconditionally, and `shell::push` uses
`--force-with-lease` whenever a force is asked for, never a plain `--force`.

The second is the item's own instruction, honoured: force destroys other
people's work, so the only force available anywhere in the codebase is the one
that refuses when the remote has moved — and no interface offers even that.

The first is **not** what the item asked for. Pruning was scoped as an explicit
choice because it deletes remote-tracking refs, which Amendment 6 counts as
destructive. It is currently silent and unconditional. Recorded as owed rather
than defended.

### Every layer takes a remote; the button sends none

`fetch(remote)`, `push(remote, refspec, force)` exist all the way from
`shell.rs` through the command and `api.ts`. The toolbar calls them with their
defaults — all remotes, and whatever `git push` alone means for the current
branch. So per-remote work needs an interface, not plumbing.

### Failure is a sentence

Both go through `actions.perform`, which reports git's own message and does not
re-read on failure. `GIT_TERMINAL_PROMPT=0` in `shell.rs` means a missing
credential fails rather than hanging behind an invisible prompt, which is what
makes "a sentence the user can act on" possible at all.

## What is still owed

In the order they are worth doing:

1. **Pruning as a choice.** It is destructive and it is silent. Either offer it
   or say it is happening.
2. **`--set-upstream` on first push.** A new branch pushes with git's error
   today; the app knows there is no upstream and could offer it.
3. **Per-remote fetch and push**, for repositories with more than one.
4. **Progress.** `--progress` is passed and nothing streams it. The command log
   shows the invocation, not its output as it arrives.
5. **Staleness on the Branches screen.** The counts are as old as the last
   fetch, and the screen does not say so.

Each is small on its own; together they are the second half of this item and are
not folded into anything else.

## Files

`crates/gitlumiere-core/src/shell.rs` — `fetch`, `push`.
`crates/gitlumiere-core/src/ops.rs` — both ops.
`src-tauri/src/commands.rs`, `src-tauri/src/lib.rs` — commands and registration.
`src/lib/api.ts` — `fetch`, `push`.
`src/lib/graph/actions.ts` — `fetchAll`, `pushCurrent`.
`src/lib/chrome/Toolbar.svelte` — the two buttons.

## Testing

See `FEAT-018-automated.md`. The frontend tests own the confirmations and the
failure reporting; the shell layer is argument assembly over `run`, whose
behaviour the existing shell tests cover.

## Risk

Push is the first thing GitLumiere does that other people can see, which is why
there is no force in any interface and why the failure path is tested before the
success path.

The live risk today is the silent prune: a user who fetches loses remote-tracking
refs without being asked. Nothing local is lost, and git's own default for
`fetch --prune` in many configurations is the same, but it is still a destructive
default the item did not sanction.

## Rollback

The buttons can be disabled without touching the plumbing. Reverting either
commit would take unrelated work with it.
