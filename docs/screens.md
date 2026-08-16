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
| 1D | Conflicts | `/conflicts` | yes | Built | FEAT-008 |
| 1E | Interactive rebase | `/rebase` | yes | Built | FEAT-009 |
| 1F | Branches | `/branches` | yes | Built | FEAT-004 |
| 1G | Stash | `/stash` | yes | Built | FEAT-005 |
| 1H | Pull requests | `/requests` | yes | Stub | FEAT-010 |
| 1I | Log search | `/search` | yes | Built | FEAT-007 |
| 1J | All repositories | `/repos` | yes | Built | FEAT-006 |
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

**Built.** `src/routes/conflicts/+page.svelte`, `src/lib/conflicts/`.
Resolution writes are deferred to FEAT-016.

Ours, the merged result and theirs, side by side, with the common ancestor
behind a disclosure. The three come from the index: when git cannot merge two
versions of a file it keeps all three — stage 1 the base, stage 2 ours, stage 3
theirs — and leaves the working-tree file with markers in it. That is the whole
data model, and `crates/gitlord-core/src/conflicts.rs` is a reader for it.

Which stages exist *is* the kind of conflict. No stage 1 means both sides added
the path; a missing stage 2 or 3 means that side deleted it, and the pane says
so rather than rendering empty — an empty pane reads as "they emptied the file",
which is a different thing and one that loses work if acted on.

The operation in progress is read from the repository's own state, never
inferred from the presence of conflicts. Merge, rebase, cherry-pick and revert
all leave conflicts behind, and naming the wrong one sends someone to the wrong
command to get out.

Nothing on this screen writes — not the module, not the commands, not the
markup. There is a test that reads the index's modification time either side of
visiting every conflicted file. Mark resolved and Abort render disabled with
FEAT-016 named on each.

## 1E — Interactive rebase

**Built.** `src/routes/rebase/+page.svelte`, `src/lib/rebase/`.
Execution is deferred to FEAT-015.

Plan a history rewrite and see the result before anything runs. Interactive
rebase is feared because the todo list is edited blind — you choose squash and
reword against a list of short ids and find out what you did afterwards — so
this screen is the preview, which is the half that carries the value and none
of the risk.

The todo list is **generated, not parsed**. Running `git rebase -i` to read the
file it opens would start a rebase, which is the thing this screen exists to
avoid; the list is `upstream..HEAD` walked oldest first with merges excluded,
which is what git itself lists, and there is a test comparing it against
`git rev-list --reverse --no-merges`.

The plan is the complete list and its order *is* the reordering. The preview is
a fold of it, recomputed after every edit, so the plan and the picture of the
plan cannot disagree. A squash folds upward, which is the direction git folds;
a plan whose first row is a squash has nothing above it and is refused with
that reason.

Rows move by drag **and** from the keyboard (`⌥↑` / `⌥↓`). Drag alone is
untestable headlessly and unusable for some people, and the store owns the
ordering so the component only reports intent.

"May conflict" is a heuristic and the screen uses that word: two commits in the
plan touching one path mark the later one. Knowing for certain means performing
the merges, which is execution. Claiming a clean result GitLord cannot prove
would be the worse lie.

Nothing runs. `shell::rebase_interactive` is still `unimplemented!()`, there is
no command that could reach it, and Apply renders disabled saying so. A test
asserts the repository is untouched after any amount of editing — no rebase in
progress, HEAD where it was, working copy clean.

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

**Built.** `src/routes/search/+page.svelte`, `src/lib/search/`.
Reached from the rail and by `⌘F` from any screen, which lands here with the
first field focused — the focus travels in the URL (`?focus=1`) rather than
through a store, so the shortcut and a bookmark behave identically.

Find commits by author, path, message or date. The filters compose as AND and
each is a chip saying exactly what is applied; the chips are derived from the
fields rather than stored beside them, so the two cannot disagree.

A search is the graph's revision walk with a predicate and without lanes.
Lanes are absent on purpose: drawing them over a filtered subset would draw
edges between commits that are not parent and child. The path filter uses git's
own simplification rule — a commit TREESAME to *any* parent is skipped — which
is what stops a merge being listed for a change it only carried across.

Results stream as the walk finds them. Each query carries a token and starting
one cancels the one before, so rows from an older query are dropped rather than
rendered; that is what makes it safe to search on a keystroke.

`↵` opens the commit in the side column — message, people, files — and `⌥↵`
opens its hunks on the Diff screen, which is a different question.

**Blame goes through the `git` binary**, and it is the one read in the
application that does. `gix::blame` 0.16, the newest published version, panics
on an ordinary history shape: a file blamed at a merge commit whose history
contains an intervening commit that left the file alone. Every diff algorithm
and both rename settings do it. The exception is recorded on `shell::blame`
with its end condition — blame moves back in-process when that is fixed
upstream. A binary file, a missing path and a directory each say which rather
than rendering an empty list, because an empty list reads as a file nobody has
ever touched.

## 1J — All repositories

**Built.** `src/routes/repos/+page.svelte`, `src/lib/repos/`.
Reached from the toolbar's repository picker.

Every repository you work in and which ones need attention: "Needs you" above
"Nothing in progress", the second rendered dashed. A card carries the branch,
the path, what the repository was last doing, and a chip for each thing going on
— conflicts first, since those are what stop work.

GitLord never goes looking for repositories. Opening one is the only way it
joins the list, which lives in GitLord's own config directory as a plain JSON
file of paths.

Each card is read where the repository sits, without opening it as the current
one, and without writing to it — there is a test that compares the index's
modification time either side of the read. A path that has gone comes back as a
card that says so rather than being dropped: a repository that moved is
something to see, not something to forget quietly. Forgetting removes the row
and never the directory.

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
