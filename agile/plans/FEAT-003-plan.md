<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-003 — Plan

## Approach

Reading and writing the working copy are different problems and live in
different modules.

- **`status.rs`** grows the read: `working_copy()` returns three lists —
  staged, unstaged (untracked included) and conflicted — and `counts()` finally
  fills `working`, `staged` and `conflicts` from it.
- **`work.rs`** is new and holds the write: stage, unstage, stage a hunk,
  unstage a hunk, commit.
- **`diff.rs`** grows `working_file_diff`, which is the existing hunk machinery
  pointed at a different pair of sides, plus the patch builder hunk staging
  needs.

## Decisions

**Three lists, not one list of rows carrying flags.** A path can be staged
*and* unstaged at once — staged in part, or changed again afterwards. Folding
that into a single row per path is exactly the lie that makes people commit
something they did not mean to, so the model keeps them separate and the screen
shows the path twice.

**The rail's Working copy count and the toolbar's Commit count are different
numbers.** `working` is distinct changed paths, the same figure
`git status --porcelain` prints a line for. `staged` is what a commit would
actually contain. The toolbar reads `staged`: a working copy with ten changed
files and one staged must not offer to "Commit 10 files" and then commit one.

**Reads through `gix`, writes through `git`.** The rule in `shell.rs`'s header
decides it, not convenience: the status walk is a read and stays in-process,
while the index and the commit are the state every other tool reads. Hooks and
signing settle it further — a commit written by us would silently skip both, so
a commit made in Spagitty would differ from the same commit made on the command
line. The table in that header is extended in this change with the two new
rows.

**Hunk staging sends an index and a header, not a patch.** The UI could send
the patch text it is displaying, and that would be simpler and wrong: the file
may have changed since the screen read it, and applying a stale patch
half-stages a file. Instead the core rebuilds the patch from the bytes as they
are now, and refuses when the hunk's header no longer matches — turning
staleness into a plain refusal rather than a wrong result.

**The patch builder emits `\ No newline at end of file`.** Without it, staging
the last hunk of a file that has no trailing newline would quietly add one. That
is a content change nobody asked for, and it is invisible in the diff that
caused it.

**Nothing on this screen can discard work.** Stage, unstage and commit only move
changes forward; there is no revert, no checkout of a path, no clean. A mistake
costs an unstage, never work. Discarding is a separate decision and a separate
item.

**Every write is followed by a fresh status walk.** Staging changes what every
other row means. Patching the lists in place would be faster and is how a UI
ends up disagreeing with the index.

**The hunk pane is unified only.** Split is for reading a commit someone else
wrote. Here the question is "does this hunk belong in the commit", and one
column keeps the answer beside the button.

## Files

Core:

- `crates/spagitty-core/src/status.rs` — `StatusEntry`, `WorkingCopy`,
  `working_copy()`, real counts
- `crates/spagitty-core/src/work.rs` — new
- `crates/spagitty-core/src/diff.rs` — `Side`, `working_file_diff`,
  `working_hunk_patch`, `FileStatus::Untracked`
- `crates/spagitty-core/src/shell.rs` — `stage`, `unstage`, `apply_to_index`,
  `commit`, `head_message`, `run_with_stdin`, and two new rows in the header
  table
- `crates/spagitty-core/src/error.rs` — `Status`, `NotStageable`, `Stale`,
  `EmptyMessage`
- `crates/spagitty-core/src/fixture.rs` — `Fixture::conflicted`

Tauri and wire:

- `src-tauri/src/commands.rs`, `lib.rs` — eight commands
- `src/lib/types.ts`, `src/lib/api.ts`

Frontend:

- `src/lib/changes/{store.svelte.ts,FileColumn.svelte,HunkPane.svelte,MessageBox.svelte}`
- `src/routes/changes/+page.svelte` — replaces the `ScreenStub`
- `src/lib/chrome/Toolbar.svelte` — counts `staged`
- `src/lib/metrics.ts` — `CHANGES_FILES_W`

## Steps

1. Core read: the status walk and the counts, with tests.
2. Core write: `work.rs` on top of `shell.rs`, with tests — the stage/unstage
   round-trip and the hunk cases first, since they are what can lose work.
3. Commands and wire types.
4. Store, then the three components, then the screen.
5. Frontend tests, then the visual sweep.

## Risks

- **Hunk staging is the dangerous piece.** Mitigated by never touching the
  working tree (`git apply --cached`), by rebuilding the patch from current
  bytes, by the header check, and by tests that assert the file on disk is
  unchanged and that stage-then-unstage is a byte-for-byte round trip.
- **The status walk is expensive** and now runs on every snapshot, which the
  filesystem watcher triggers. The watcher already debounces; if it shows up in
  practice the fix is to pass the walk's result through rather than recompute.
- **A conflicted repository** must not offer to commit. The commit button is
  disabled while anything is conflicted, and the footer says why.

## Rollback

Revert the commit. The Graph and Diff screens do not depend on any of it; the
rail counts would go back to `·` and the route back to its `ScreenStub`.
