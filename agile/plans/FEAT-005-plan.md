<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-005 — Plan

## Approach

`stash.rs` enumerates entries and pushes new ones. It contains no diffing code
at all, which is the whole point of the design below.

## Decisions

**A stash is a commit, so the Diff screen already knows how to read one.** A
stash commit's first parent is the commit the work was made on, so
`commit_diff(entry.id)` is exactly `git stash show`. The rows carry the stash
commit's id and the detail panel asks the existing command about it. A
`stash_diff` command would have been a second implementation of something that
already worked.

*Alternative rejected:* a dedicated stash-contents command. It would have had
the same body as `commit_diff` and one more chance to disagree with it.

**The list is a reflog read.** `refs/stash` is an ordinary ref whose reflog is
the list — `stash@{n}` is literally the nth entry, newest first. The file is
oldest-first, so the walk is reversed; the index is assigned from that order
rather than parsed out of the message.

**An entry whose commit has been collected is dropped, not shown.** The reflog
line outlives the object it names. A row pointing at nothing would be a stash
that cannot be opened.

**Stashing nothing is refused.** `git stash push` succeeds quietly with nothing
to save — it prints "No local changes to save" and creates no entry. From a
button that reads as a stash that happened and then vanished, so the core checks
the working copy first and refuses with a reason. The check mirrors git's own
rule: untracked files alone are only stashable when untracked files were asked
for, and the refusal says so.

**The lane uses the graph's metrics but not its canvas.** The canvas exists to
keep scrolling cost flat across a hundred thousand rows. A stash list is a
dozen, and two circles and a bezier per entry is the smaller thing that reads
the same. The elbow's control points are the graph's, so the shape matches.

**Pop, apply and drop render disabled with their reasons.** Restoring the work
is what a stash is *for*; a screen that listed stashes while pretending they
could not be restored would be lying about what it is showing. Each chip says
what it would do, and the panel names the terminal command that does it today.

## Files

- `crates/spagitty-core/src/stash.rs` — new
- `crates/spagitty-core/src/shell.rs` — `stash_push`
- `src-tauri/src/commands.rs`, `lib.rs` — two commands
- `src/lib/types.ts`, `src/lib/api.ts`
- `src/lib/stash/{store.svelte.ts,StashList.svelte,StashDetail.svelte}`
- `src/routes/stash/+page.svelte` — replaces the `ScreenStub`

## Risks

- **A stash that cannot be restored is a trap**, so the screen says clearly that
  bringing work back is not built and names the command that does it. FEAT-014
  removes the need for that sentence.
- **Stashing writes the working tree**, which is the one thing on this screen
  that moves the user's files. It is git's own operation, unmodified, and the
  entry it creates is the record of what moved.

## Rollback

Revert the commit. The rail's stash count predates this item and survives it.
