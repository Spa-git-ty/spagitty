<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-006 — Plan

## Approach

Two halves in two places, because they are two different kinds of state.

- **`repo::summary(path)`** in the core describes a repository *where it sits*,
  without making it the open one: no walk, no worker, no watcher.
- **`src-tauri/src/recents.rs`** holds the list of paths. That is application
  state — a record of what the user opened — so it belongs in GitLord's own
  config directory beside their other preferences, not in a git module.

## Decisions

**GitLord never goes looking for repositories.** Opening one is the only way it
joins the list. A filesystem scan would be faster to write and would mean the
application crawling directories it was never pointed at; the screen says so in
its footer, and the promise is worth more than the convenience.

**A summary never writes to the repository it reads.** These are repositories
the user is *not* working in. Leaving a rewritten index or a lock behind in
someone else's checkout is not something a list of cards may do, and there is a
test that reads the index's mtime either side of the call to prove it. (The test
takes both readings with nothing in between, because `git status` itself
rewrites the index to cache stat information — the first version of it failed
for exactly that reason.)

**A missing path is a card, not a deletion.** The list is the user's own record
of where their work is. A repository that has moved is something they should
see; dropping the row would hide the only clue to where it went. The card keeps
the path visible and says GitLord has not touched it.

**`summary` never fails.** One bad entry must not take the screen down with it,
so a broken path returns a card that says so rather than an error that loses the
other nine.

**Write failures are kept apart from read failures.** Every write is followed by
a re-read, and a successful re-read clears `error` — so a failure recorded there
would be wiped by the reload reporting it. A test caught this; `writeError` is
the fix.

**Two groups, not a sort.** "Needs you" and "Nothing in progress" answer the
question the screen exists for. Idle cards render dashed, the same device the
Commit screen uses for "not yet" and the Branches screen for "spent".

**Forgetting is the one destructive-sounding action that is not destructive.**
It removes a row from a JSON file. The button says so on hover and the footer
says so permanently.

## Files

- `crates/gitlord-core/src/repo.rs` — `RepoSummary`, `summary`
- `src-tauri/src/recents.rs` — new; `src-tauri/src/commands.rs`, `lib.rs`
- `src/lib/types.ts`, `src/lib/api.ts`, `src/lib/metrics.ts`
- `src/lib/repos/{store.svelte.ts,RepoCard.svelte}`
- `src/routes/repos/+page.svelte` — replaces the `ScreenStub`

## Risks

- **Reading many repositories costs a status walk each.** The list is capped at
  50 and the walks are cheap on a clean checkout; if it shows up on a slow disk
  the fix is to read cards lazily rather than to drop the counts.
- **The config file can be edited by hand**, and a corrupt one must not stop the
  application starting. It is parsed leniently and falls back to an empty list.

## Rollback

Revert the commit. The list file is left behind and is harmless.
