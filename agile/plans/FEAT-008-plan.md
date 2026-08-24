<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-008 — Plan

## Approach

One new core module, `crates/spagitty-core/src/conflicts.rs`, and one screen.
The module answers three questions and writes nothing:

- **What is conflicted** — the index's stage 1/2/3 entries, grouped by path.
- **What each side holds** — the three blobs, plus the working-tree file with
  its markers.
- **What operation is in progress** — read from the repository's own state.

## Decisions

**The index is the source, not the status walk.** `status::working_copy`
already lists conflicted paths, and it is tempting to reuse. It cannot be the
source here: it reports *that* a path is conflicted and nothing about the
stages, which is the entire content of this screen. So the module reads the
index directly and the status list becomes the cross-check in a test — two ways
of finding the same paths, which is worth more than one way used twice.

**Which stages are present is the kind of conflict.** Stages 1, 2 and 3 mean
both sides modified; 2 and 3 with no base mean both sides added the file; a
missing 2 or 3 means that side deleted it. The screen labels the missing side
as deleted rather than drawing an empty pane, because an empty pane reads as
"they emptied the file" — which is a different thing, and one that would lose
work if acted on.

**The operation is read, never inferred.** Merge, rebase, cherry-pick and
revert all produce conflicts, and telling the user "merge" during a rebase
would send them to the wrong command to get out. `gix::state::InProgress`
reports what git's own `.git` directory says; conflicts with no operation in
progress are possible too, and that state is reported honestly rather than
guessed at.

**Binary sides are named, not decoded.** The same NUL-byte sniff `diff.rs`
uses, so Spagitty calls the same files binary that `git diff` does, and the pane
says so instead of rendering mojibake.

**Nothing writes.** Not the module, not the commands, not the screen. The
resolution actions render disabled with FEAT-016 named on each. The proof is
the `repo::summary` pattern: the index's mtime read either side of visiting
every conflicted file, both readings taken with nothing in between.

**A side that is too large is a state, not a failure.** Same ceiling as
`diff.rs`; a repository with a 200MB conflicted asset must not freeze the
window.

## Files

- `crates/spagitty-core/src/conflicts.rs` — new; `lib.rs` gains the module
- `crates/spagitty-core/src/fixture.rs` — fixtures for add/add, delete/modify
  and a binary conflict
- `src-tauri/src/commands.rs` — `conflicts`, `conflict_sides`; `lib.rs`
- `src/lib/types.ts`, `src/lib/api.ts`
- `src/lib/conflicts/{store.svelte.ts,ConflictPager.svelte,SidePane.svelte}`
- `src/routes/conflicts/+page.svelte` — replaces the `ScreenStub`

## Risks

- **A delete/modify fixture needs a real merge that stops.** Built with the
  `git` binary like every other fixture, so what is tested is what git
  produces, not what we think it produces.
- **Three panes of file content is a lot of text to hold.** Each side is capped
  the way `diff.rs` caps a blob, and the panes render plain text rather than a
  diff, so there is no per-line structure to build.

## Rollback

Revert the commit. The screen returns to its stub; nothing on disk changed,
because nothing on disk was ever written.
