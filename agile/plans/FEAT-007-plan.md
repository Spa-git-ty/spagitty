<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-007 — Plan

## Approach

Two new core modules and one screen.

- **`search.rs`** — a filtered history walk. Author, message, path and a date
  range, composed as AND, streamed through the same sink-and-flow protocol the
  graph walk uses.
- **`blame.rs`** — who last touched each line, over `gix::blame`.
- **`src-tauri/src/search_worker.rs`** — one thread per query, cancelled when a
  newer query starts.

## Decisions

**A search is a walk with a filter, not a second traversal.** `graph::walk`
exists and works; what search needs is the same revision walk with a predicate
and without lanes. `search.rs` therefore does its own `rev_walk` rather than
wrapping `graph::walk`, because the one thing `graph::walk` adds — sequential
lane assignment — is the one thing a filtered list must not have.

**Search results have no lanes, and that is the point.** Drawing lanes over a
filtered subset would draw edges between commits that are not parent and child.
The rows carry everything else the graph rows carry — initials, short id,
summary, refs, relative time — so a result looks like what it is without
claiming a shape it does not have. That means the screen has its own row
component rather than reusing `graph/CommitRows.svelte`, which is welded to the
graph store's virtualisation and its lane canvas. The shared parts — `RefChip`,
`format.ts`, the row pitch — are reused directly.

**The path filter uses git's own simplification rule.** A commit is a match for
a path when its blob at that path differs from *every* parent's. That is what
makes `git log -- <path>` skip a merge that brought a change in from one side
rather than making it: git calls that TREESAME and simplifies it away. The
naive rule — "differs from the first parent" — would list merges git does not,
and criterion 1 says the output has to be what git's is.

**Substring, not regex, and case-insensitive.** Regular expressions are
explicit non-scope for this pass. The tests compare against
`git log -i --fixed-strings --grep=…`, so what is being asserted is the same
question asked two ways, not one implementation's opinion of the other.

**A query is restartable, not resumable.** The graph worker is resumable
because lanes must be computed in order from the beginning; a query has no such
constraint, and typing in a search field produces a new query every keystroke.
So each query is a fresh thread with a token, and starting one cancels the one
before. Rows from any other token are dropped by the store — the same rule the
graph already applies.

**Blame stays in-process.** `shell.rs` draws the line at operations that mutate
state the wider ecosystem reads; blame reads. `gix::blame` is already in the
dependency tree through `gix`'s default features, so nothing new is linked in.

**Blame reports its own refusals.** A binary file, a path that is not in that
revision, and a directory each come back saying which, rather than as an empty
list that reads like a file nobody has ever touched.

## Files

- `crates/gitlord-core/src/search.rs`, `blame.rs` — new; `lib.rs`
- `src-tauri/src/search_worker.rs` — new; `commands.rs`, `lib.rs`
- `src/lib/types.ts`, `src/lib/api.ts`
- `src/lib/search/{store.svelte.ts,QueryBar.svelte,ResultRows.svelte,BlameStrip.svelte}`
- `src/routes/search/+page.svelte` — replaces the `ScreenStub`
- `src/lib/chrome/` — `⌘F` from any screen

## Risks

- **A path filter costs a tree comparison per commit.** Cheap per commit and
  unbounded over history, which is why the walk streams and is cancellable
  rather than returning a list.
- **`gix::blame` is a low-level entry point.** If its inputs turn out not to be
  reachable through `gix`'s re-exports, the fix is adding `gix-blame` and
  `gix-diff` as explicit dependencies — same licences, no new question.
  Shelling out to `git blame` is not the fallback; it would breach the
  `shell.rs` rule.
- **Blame on a large file is slow.** It is asked for explicitly, one file at a
  time, and the screen says it is working.

## Rollback

Revert the commit. The screen returns to its stub; nothing was written to any
repository, because nothing in this change writes.
