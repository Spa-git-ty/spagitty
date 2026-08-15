<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# Screens

One section per screen. Each screen carries a short code — `1A`, `1B`, … — so it
can be named in one token in a commit message or a conversation. The codes and
their order come from the design handoff and are declared in `src/lib/nav.ts`.

**This document is updated by each screen's own work item**, in the same change
as the code. A section describing something that no longer exists is a defect
under Amendment 11.

| Code | Screen | Route | Rail | State | Item |
| --- | --- | --- | --- | --- | --- |
| 1A | Graph | `/` | yes | Built | FEAT-001 |
| 1B | Diff | `/diff` | no | Built | FEAT-002 |
| 1C | Working copy | `/changes` | yes | Built | FEAT-003 |
| 1D | Conflicts | `/conflicts` | yes | Stub | FEAT-008 |
| 1E | Interactive rebase | `/rebase` | yes | Stub | FEAT-009 |
| 1F | Branches | `/branches` | yes | Built | FEAT-004 |
| 1G | Stash | `/stash` | yes | Built | FEAT-005 |
| 1H | Pull requests | `/requests` | yes | Stub | FEAT-010 |
| 1I | Log search | `/search` | yes | Stub | FEAT-007 |
| 1J | All repositories | `/repos` | yes | Stub | FEAT-006 |
| 1K | Settings | `/settings` | yes | Stub + real About | FEAT-011 |
| 1L | Clone | modal | no | Not started | FEAT-012 |

"Stub" means the route exists and renders `src/lib/ui/ScreenStub.svelte`, which
states what the screen will be rather than pretending to be it. A half-built
screen that looks real is harder to read than an honest empty one.

## The chrome

Persistent across every screen, built with FEAT-001.

- **Title bar** — repository name, current branch, theme toggle, build identity,
  window buttons. The window is undecorated, so the title bar is also the drag
  handle and `src/lib/chrome/ResizeEdges.svelte` provides the resize edges.
- **Toolbar** — repository and branch pickers, Undo/Redo, Fetch, Push, Branch,
  Stash, Rebase, and the primary Commit button. Actions that are not built yet
  say so on hover rather than failing silently when clicked.
- **Nav rail** — the only answer to "where am I": the active item and the route
  are the same fact. Counts are right-aligned; `·` means "not computed yet", and
  screens that do not exist report `·` rather than a number that would be wrong.

## 1A — Graph

**Built.** `src/routes/+page.svelte`, `src/lib/graph/`.

The centre of gravity. A streamed, virtualised commit list with a lane canvas, a
refs gutter, and a detail panel. Rows arrive in batches from a worker thread and
never move once drawn. Clicking selects; double-clicking opens the diff.

The lane column stops widening at twelve columns — the reasoning and the
measurements are in the doc comment on `LANE_COLUMNS_MAX` in
`src/lib/metrics.ts`.

## 1B — Diff

**Built.** `src/routes/diff/+page.svelte`, `src/lib/diff/`.

One commit's changes, file by file and hunk by hunk. A full-window takeover
rather than a rail screen: opened from a commit, answering one question, with
`Esc` returning to the graph.

Loaded in two steps — the file list and totals in one call, a file's hunks as it
is selected — and hunks are cached by path for the open commit. Unified and
split views are the same data; `src/lib/diff/split.ts` pairs a run of removals
with the additions that follow it.

## 1C — Working copy

**Built.** `src/routes/changes/+page.svelte`, `src/lib/changes/`.

Stage what you mean to commit, write the message, commit. A 250px column holds
Staged above Unstaged — solid rows against dashed ones — and a path appears in
both when it is staged in part. Beside them: the message box, then the hunks of
the selected file with one action each, `stage hunk` or `unstage hunk`
depending on which side is open.

Its status walk is what made the rail's Working copy and Conflicts counts real.
The toolbar's Commit button counts `staged` rather than `working`: a working
copy with ten changed files and one staged must not offer to commit ten.

Nothing here can discard work. Stage, unstage and commit only move changes
forward; a mistake costs an unstage. Discarding is a separate decision and is
not built.

## 1D — Conflicts

**Stub.** Planned in FEAT-008; resolution writes deferred to FEAT-016.

Ours, the merged result, and theirs, side by side, read from index stages 2, 0
and 3. Read-only in the first pass.

## 1E — Interactive rebase

**Stub.** Planned in FEAT-009; execution deferred to FEAT-015.

Plan a history rewrite and see the result before anything runs. The plan is
computed in Rust; `git rebase -i` executes it, for the reasons in the header of
`crates/gitlord-core/src/shell.rs`.

## 1F — Branches

**Built.** `src/routes/branches/+page.svelte`, `src/lib/branches/`.
Delete and rename are deferred to FEAT-013.

Every branch, how far it has drifted, and what is safe to forget: branch,
ahead/behind, last change, actions. Merged branches render dashed — nothing on
them is only there — though the current branch never does, since saying
"merged" about the branch you are on reads as "safe to delete".

Ahead and behind are counted against the remote-tracking ref on disk, so they
are as old as the last fetch. The footer says so; nothing on this screen talks
to a network.

Checking out goes through `git switch`, which only ever changes branch — unlike
`git checkout`, which guesses between a branch, a revision and a path. A
checkout that would overwrite uncommitted work is refused by git, with git's own
message. Branch names are validated by git for the same reason: a second
implementation of `check-ref-format` could only disagree with it.

The branches command re-opens the repository rather than reusing the session
handle, because `gix` reads config once at open time and a branch's upstream
lives in config.

## 1G — Stash

**Built.** `src/routes/stash/+page.svelte`, `src/lib/stash/`.
Pop, apply and drop are deferred to FEAT-014.

Stash entries drawn hanging off the commit each was made on, with a detail
panel showing what is in the selected one.

There is no stash-diff code, and there does not need to be: a stash *is* a
commit whose first parent is the commit the work was made on, so the detail
panel asks `commit_diff` about the entry's id like any other commit, and
`refs/stash`'s reflog is the list — `stash@{n}` is literally the nth entry.

The lane is drawn with the graph's metrics but not its canvas. The canvas exists
to keep scrolling flat across a hundred thousand rows; a stash list is a dozen,
and a handful of SVG paths is the smaller thing that reads the same.

Stashing is the only write. `git stash push` succeeds quietly with nothing to
save, which from a button reads as a stash that happened and then vanished, so
the core refuses that case with a reason instead.

## 1H — Pull requests

**Stub.** Planned in FEAT-010 as an offline shell; forge integration is
FEAT-017.

What is waiting on you above what is waiting on everyone else. Host-agnostic
vocabulary: the hosting service is a detail, not the language.

## 1I — Log search

**Stub.** Planned in FEAT-007. Reached from the rail's filter field and `⌘F`.

Find commits by author, path, message or date, and see who last touched each
line.

## 1J — All repositories

**Stub.** Planned in FEAT-006. Reached from the toolbar's repository picker.

Every repository you work in and which ones need attention. Repositories are
read straight from disk; nothing is uploaded anywhere.

## 1K — Settings

**Stub with a real About footer.** Planned in FEAT-011.

The About footer is not deferred: GPL-3 asks that a user can obtain the source
corresponding to the exact build they are running, so the version, license and
the commit stamped in at build time are shown from the first commit, along with
the trademark notice.

## 1L — Clone

**Not started.** Planned in FEAT-012 as a modal rather than a route.

Bring a repository in. Goes through the `git` binary so credential helpers and
the OS keychain work as they do on the command line.
