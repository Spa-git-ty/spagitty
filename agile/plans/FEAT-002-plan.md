<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-002 — Plan

**Written retroactively under TASK-001.**

## Approach

Two commands, not one, because the two halves of the screen cost different
amounts:

- `commit_diff(id)` — every file the commit touched, with `+n −m` per file and
  the totals. This has to read every changed blob on both sides, because the
  per-file counts cannot be known without diffing them. It is one call, when the
  screen opens.
- `file_diff(id, path)` — one file's hunks, fetched when that file is selected
  and cached by path for the open commit.

*Alternative rejected:* one command returning every hunk of every file. On a
large commit that is megabytes of JSON crossing the IPC boundary for content the
user will mostly never scroll to, and it makes the screen's first paint wait for
the slowest file.

*Alternative rejected:* fetching per-file counts lazily as rows scroll into
view. The header total is the sum of all of them, so it would be unknown — or
wrong — until every row had been visited.

## Architecture decisions

**Hunks are computed in Rust, shipped as structured lines.** Each `DiffLine`
carries its origin and its line number on each side, so neither view has to
count rows to label them. That is what makes the split view's blank cells
harmless: a blank is the absence of a line, not an off-by-one in the numbering.

**The split view is a frontend transform, not a second backend format.**
`splitRows` in `src/lib/diff/split.ts` pairs a run of removals with the run of
additions that follows it, and context lines flush the pending runs. Switching
views is therefore free and cannot disagree with the unified view about content.

**Sequence guards, not cancellation.** Both loads increment a counter and
compare it on arrival. A response for a superseded request is dropped. This is
simpler than aborting an in-flight `invoke` and has the same visible effect.

**The cache is per-commit and deliberately small.** Hunks are kept by path while
one commit is open and thrown away when the commit changes. Walking back and
forth through a commit's files costs one fetch each; it is a within-commit
convenience, not a history of everything ever opened.

**Binary and too-large are separate flags.** They are different facts with
different sentences on screen, and collapsing them into "no diff" would leave
the user guessing which one they hit.

## Files

- `crates/gitlumiere-core/src/diff.rs` — `commit_diff`, `file_diff`, the hunk
  builder, binary sniffing, line statistics
- `crates/gitlumiere-core/src/error.rs` — `UnknownPath`
- `src-tauri/src/commands.rs`, `src-tauri/src/lib.rs` — two commands registered
- `src/lib/types.ts`, `src/lib/api.ts` — wire types and wrappers
- `src/lib/diff/{store.svelte.ts,split.ts,FileList.svelte,DiffPane.svelte}`
- `src/routes/diff/+page.svelte`
- `src/lib/metrics.ts` — `DIFF_FILES_W`, `DIFF_GUTTER_W`
- `src/app.css` — `--fs-code`
- `src/lib/graph/CommitDetail.svelte` — the left-to-right mark fix, shared with
  the new file list

## Steps

1. Core: hunk construction with git's three-line context and run merging.
2. Core: `commit_diff` and `file_diff` on top of it.
3. Commands and wire types.
4. Store with its two-step load and sequence guards.
5. File list, then the unified pane, then the split transform.
6. Keyboard handling and the screen's own header and footer.

## Risks

- **Hunk boundaries are easy to get subtly wrong**, and wrong ones are hard to
  see. Covered by unit tests over the pure hunk builder, including the empty
  range convention and CRLF.
- **A commit with thousands of files** makes `commit_diff` slow, since it reads
  every changed blob. Accepted for now: it is one call, and the alternative
  costs a correct header. Revisit if it shows up in practice.

## Rollback

Revert the commit. The screen is additive — the Graph screen does not depend on
it, beyond a double-click that would go nowhere.
