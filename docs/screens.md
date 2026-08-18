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
| 1H | Pull requests | `/requests` | yes | Built (offline) | FEAT-010 |
| 1I | Log search | `/search` | yes | Built | FEAT-007 |
| 1J | All repositories | `/repos` | yes | Built | FEAT-006 |
| 1K | Settings | `/settings` | yes | Built | FEAT-011 |
| 1L | Clone | modal | no | Built | FEAT-012 |

**Every screen in the handoff is built.** What remains deferred is named on the
screen that defers it — writes the Conflicts screen does not perform, the rebase
it plans but does not run, the host the Pull requests screen cannot connect to.
Each says so in place rather than being absent.

`src/lib/ui/ScreenStub.svelte` is no longer rendered by any route. It stays
because it is how the next unbuilt screen says what it will be rather than
pretending to be it: a half-built screen that looks real is harder to read than
an honest empty one.

## The chrome

Persistent across every screen, built with FEAT-001.

- **Title bar** — repository name, current branch, build identity, window
  buttons. The window is undecorated, so the title bar is also the drag handle
  and `src/lib/chrome/ResizeEdges.svelte` provides the resize edges.
  It carries no theme control — Settings → Appearance is the one place the
  theme is set — and no shortcut hint: it used to show `⌘K` for Log search,
  when the shortcut is `Ctrl+F` and the notation was macOS's on every platform.
  Key names are written in their `Ctrl` / `Alt` form throughout the interface.
  The one exception is the command palette, which picks its own notation from
  the platform at runtime (`src/lib/palette/commands.ts`) — macOS is a build
  target, and printing `Ctrl+` on a machine with no such key would be wrong in
  the other direction.
- **Toolbar** — repository and branch pickers, Undo/Redo, Clone, Fetch, Push,
  Branch, Stash, Rebase, and the primary Commit button. Actions that are not
  built yet say so on hover rather than failing silently when clicked.
- **Nav rail** — the only answer to "where am I": the active item and the route
  are the same fact. Counts are right-aligned; `·` means "not computed yet", and
  screens that do not exist report `·` rather than a number that would be wrong.

  The top slot is **Open repository…**, painted as the primary action (FEAT-030).
  It is the first thing a new user needs and it used to sit below a spacer at the
  bottom, which is the least discoverable place in the rail. The slot previously
  held a "filter commits / ⌘F" field that only duplicated the Log screen's own
  query bar and the `Ctrl+F` shortcut; it is gone. The foot keeps the "Tags N ·
  Submodules N" line, now alone.

  Rail order is the screens roughly as they are worked through — Graph, Working
  copy, Conflicts, Branches, Stash, Pull requests, Rebase, Log — then a divider,
  then All repositories and Settings. Log follows Rebase because it is where you
  go to look something up rather than a step in that sequence.

## 1A — Graph

**Built.** `src/routes/+page.svelte`, `src/lib/graph/`.

The centre of gravity, and the application's primary navigation surface rather
than a read-only report: almost every operation GitLumiere can perform is reachable
from a right-click here.

A streamed, virtualised commit list with a lane canvas, a configurable column
table, and a detail panel. Rows arrive in batches from a worker thread and never
move once drawn. Clicking selects; double-clicking opens the diff.

**Operations** (FEAT-022, `src/lib/graph/actions.ts`). Right-click a commit for
create-branch/tag-here, reset (soft/mixed/hard, named by effect rather than by
flag), revert, cherry-pick, rebase-onto, detached checkout and copy-SHA.
Right-click a branch label for merge, rebase, fast-forward, rename, delete, pin,
hide and solo. Dragging one label onto another offers the three integration
verbs, with the gesture carrying the direction. Shift and Ctrl/Cmd build a
second selection — separate from the detail panel's — that cherry-picks a group
or rebases a range.

Every destructive operation confirms through `Dialog` and reports through
`Notice`, both mounted by the shell.

**Noise control** (`visibility.svelte.ts`). Hide, solo, smart branch visibility
and pin-to-left, all per repository, all resolved to a root set for a fresh walk
rather than to a filter over drawn rows. The header chip always names the
current scope and the gear lists what is hidden, soloed or pinned with a way
back — a filter you cannot see is a filter you forget is on. The author filter
is the exception: it **dims** rather than removes, because on the graph the
shape is the thing being looked at.

**The table** (`columns.svelte.ts`, `GraphHeader.svelte`). Branch/Tag, Graph,
Commit Message, Author, Date/Time, SHA. Right-click the header to toggle, drag
to reorder, drag a divider to resize; choice, order and widths are saved per
repository. Author avatars are initials on a lane colour computed locally —
never fetched, for the reasons in `src/lib/graph/avatar.ts`.

The lane column stops widening at twelve columns — the reasoning and the
measurements are in the doc comment on `LANE_COLUMNS_MAX` in
`src/lib/metrics.ts`.

**Past that cap the pitch gives, not the column** (FEAT-035). A thirteenth lane
is drawn closer to its neighbour rather than on top of it: the lanes share out
`LANE_SPAN` between them, down to a floor of `LANE_PITCH_MIN`, so the column's
width never depends on how busy the history is and the graph can never reach the
message column. The node radius follows the pitch down — the node is what set
the pitch in the first place, and a full-size portrait on a compressed column
would paint straight back over the room the compression made.

Two limits remain, both deliberate. Up to 32 lanes a node still fits inside its
own pitch; past that it is held at `MERGE_R` and begins to overlap its
neighbour, because a node that kept shrinking would stop being visible at the
depth where it is the only thing locating a commit. And at 48 lanes the pitch
reaches its floor, after which the deepest lanes do share a column — the old
behaviour, now reached four times deeper. `git/git` peaks at 382 lanes; some
histories defeat any width.

The lane pitch, node radius and elbow control points were
retuned in FEAT-022 against `docs/reference/gitkraken-commit-graph.md`, which
also records what this graph deliberately will **not** do: no dragging commits,
no inline message editing, no manual lane layout, no independent graph zoom.

### Nodes, lanes and the column (FEAT-023)

A node is the **author's portrait**, generated from their email — Boring
Avatars' marble construction rebuilt over the theme's own lane palette in
`src/lib/graph/portrait.ts`. Nothing is fetched: a picture per author would be a
request per author on the app's most performance-sensitive screen, would hand
the repository's committer list to whichever service was asked, and would make
an offline repository look different from an online one. The face is a function
of the address, so it is the same on every machine and every launch. One
description, two renderers — canvas for the node, CSS gradients for the Author
column — so a person has one face on the screen.

A **merge is a plain dot**, not a face: it is the moment two lines join rather
than one person's work, and putting the merge author's portrait on it would
claim they wrote the branch it swallowed.

The lane column is a **surface of its own** — `--graph-bg`, a mix of `--panel`
and `--bg` so every palette gets one — bounded by a hairline, painted per row so
it scrolls with the rows rather than a frame behind them.

Geometry moved with the faces: node radius 11, lane pitch 26, stroke 2.5, elbow
control points 0.55/0.45. A five-lane column is 149px where it was 96px. FEAT-022
had taken it down from 150px because the graph crowded the messages; FEAT-023 put
129px back and FEAT-029 the rest, deliberately, because a face needs room — and
a face at 8.5px radius was still being read as a coloured dot.

**Hovering dims nothing.** Hovering a branch label used to grey out every commit
outside it and hovering a row drew a dashed ghost line to its nearest reference.
Both fire on a pointer that is only passing through, so the screen flickered as
the mouse crossed it. The author filter still dims, because it is a standing
question the user typed rather than a side effect of where the pointer is.

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
data model, and `crates/gitlumiere-core/src/conflicts.rs` is a reader for it.

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

Rows move by drag **and** from the keyboard (`Alt+↑` / `Alt+↓`). Drag alone is
untestable headlessly and unusable for some people, and the store owns the
ordering so the component only reports intent.

"May conflict" is a heuristic and the screen uses that word: two commits in the
plan touching one path mark the later one. Knowing for certain means performing
the merges, which is execution. Claiming a clean result GitLumiere cannot prove
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

Stash entries drawn hanging off the commit each was made on, with a detail
panel showing what is in the selected one.

Pop, apply and drop are wired (FEAT-014). Each goes through
`stash.restore(action)`, which hands the confirmation and the write to
`graph/actions.ts` and then re-reads the list — the confirmation is written once
there, so this screen and the graph's own stash menu cannot describe the same
operation two different ways. `actions.stash` answers whether anything changed,
so a cancelled dialog does not cost a re-read. Pop and drop release the
selection before re-reading; apply keeps the entry open.

A **conflicted apply** is not yet handled as its own state: `git stash pop` onto
a conflict leaves the entry in place and the working copy conflicted, and today
that surfaces as git's own message in a notice. Honest, but not the designed
recovery FEAT-014's notes asked for — it needs a conflict write path and belongs
with FEAT-016. Browsing an entry file by file is FEAT-034.

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

**Built, offline.** `src/routes/requests/+page.svelte`, `src/lib/requests/`.
Connecting a host is FEAT-017.

What is waiting on you above what is waiting on everyone else: solid rows over
dashed ones, with the detail panel beside them — the same two-group device All
repositories uses.

**GitLumiere talks to no hosting service, and cannot.** No HTTP client is linked
into this application in either language, and there is a test that reads the
manifests and the screen's own source to keep it that way. A screen with no way
to make a request cannot make one, which is a stronger claim than any
behavioural test could make.

The empty state is the screen rather than a placeholder. "No account is
connected", with a way to Settings → Accounts, tells the user the screen works
and the account does not — which is the difference between this and the
`ScreenStub` it replaces.

`PullRequest` in `src/lib/types.ts` is FEAT-017's contract, written now so that
connecting a host is a matter of filling it in rather than redesigning the
screen around whatever one host's API happens to return. The vocabulary is
host-agnostic throughout, and a test asserts no host's name appears anywhere in
the screen — the kind of thing that rots the moment somebody adds "Open on
<host>" without thinking.

## 1I — Log search

**Built.** `src/routes/search/+page.svelte`, `src/lib/search/`.
Reached from the rail and by `Ctrl+F` from any screen, which lands here with the
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

`↵` opens the commit in the side column — message, people, files — and `Alt+Enter`
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

GitLumiere never goes looking for repositories. Opening one is the only way it
joins the list, which lives in GitLumiere's own config directory as a plain JSON
file of paths.

Each card is read where the repository sits, without opening it as the current
one, and without writing to it — there is a test that compares the index's
modification time either side of the read. A path that has gone comes back as a
card that says so rather than being dropped: a repository that moved is
something to see, not something to forget quietly. Forgetting removes the row
and never the directory.

## 1K — Settings

**Built.** `src/routes/settings/+page.svelte`, `src/lib/settings/`.

Five sections behind a chip index — You, Accounts, Behaviour, Appearance,
License — because these are read rarely and changed rarely, and one route that
says which part of itself is showing is easier to link to than five rail
entries. The section is in the URL fragment, so `/settings#accounts` lands where
the Pull requests screen points.

The last section was called **Advanced** until TASK-007. It has only ever held
the version, the build, the project's licence and its dependencies' licences, so
the name described nothing it contained. `#advanced` is still accepted as a
fragment and selects the renamed section, because a link written before the
rename doing nothing at all is worse than one that is merely out of date.

**Nothing here needs an open repository.** With none, the identity falls back to
the global scope alone and every other section is unaffected.

**Appearance is the only place the theme is set.** Four families — Catppuccin,
Dracula, Tokyo Night, Gruvbox — each with a light and a dark variant, named the
way the family names them. Each is shown as its own four colours in the mode
that is currently on, because a light preview of a theme about to be used in the
dark is a preview of something nobody will see. The title bar's toggle is gone;
one preference with two controls is two things to keep in step.

The palettes are **data**, in `src/lib/themes.ts`, applied to `<html>` as custom
properties by `src/lib/theme.svelte.ts`. Eight blocks of CSS would be the same
sixteen tokens written eight times with nothing able to check them; as data they
are tested, and what is tested is the thing that matters about a colour —
whether it can be read. `src/lib/themes.test.ts` computes WCAG contrast for all
eight, compositing the translucent tokens over what shows through them, and
holds ordinary text to 4.5:1 and secondary text, the accent and every lane
colour to 3:1. Three published values failed that and were adjusted rather than
shipped: Latte's pink, peach and yellow are invisible as lanes on its own
background, and Tokyo Night Day's blue cannot carry white text. Each departure
is marked where it is made.

`src/app.css` carries the default family's two palettes. They are the boot
values — what paints before any JavaScript runs — and nothing else; editing a
colour there changes the first frame and not the theme.

**The identity is read with `gix` and written with `git`.** That is the
`shell.rs` rule applied without an exception: `.git/config` and `~/.gitconfig`
are state the whole ecosystem reads, so writing them goes through `git config`;
reading them does not. `crates/gitlumiere-core/src/identity.rs` is both halves.

**The scope is a parameter, never inferred.** Writing to the wrong one is the
quiet mistake this screen is shaped around — a repository-local identity that
silently became global is found months later on somebody else's commits. So both
values report which file they came from, the fields say which one they are
editing, and changing scope refills them rather than carrying a typed value
across. A value coming from the system configuration or the environment is named
as such rather than as a scope GitLumiere writes, because editing the global field
would not change it.

**Clearing unsets the key.** `git config --unset`, not an empty string. An empty
`user.email` is a *configured* empty email, which git will happily commit with;
an unset one falls back to the next scope, which is what "clear" means.

**A toggle that does nothing yet says so.** The three behaviour toggles persist
in GitLumiere's own config directory beside the repository list, with the same
lenient-parse-or-default treatment for the same reason. A toggle that is not
honoured yet names the item that will honour it — signing is still waiting on
FEAT-019 — because narrowing the claim to the truth is better than a switch that
silently does nothing.

**"Show the git command behind each action" is honoured** (FEAT-020). It adds a
Commands button to the toolbar and a palette command; both open a drawer listing
what GitLumiere actually ran, newest first, with the exit code and git's own stderr
under anything that failed. The lines come from `record.rs`, written by the
module that spawns the process, so the panel shows the flags the shell layer
added rather than what a screen believed it asked for. Reads are absent and the
drawer says why: history, refs, diffs and status are answered in-process and
have no command line at all.

The toggles are read by the shell on start, not only by this screen. Everything
that consults them — the confirmation before a history rewrite, the command
log — is reachable without ever opening Settings, and before that read landed
they answered from the defaults instead of from what the user chose.

**About carries the GPL-3 obligations**, and they were never deferred: the
version, the license, the commit stamped in at build time, and the trademark
notice were in the stub's footer from the first commit. They moved into this
section rather than disappearing while it was rebuilt.

The dependency license list is **generated at build time from the two
lockfiles**, not typed — a hand-written list is wrong by the next update.
`src-tauri/licenses.rs` reads `cargo metadata` for the Rust half and
`package-lock.json` for the npm half, and lists only what is *linked*: build and
development dependencies are not distributed, so describing them as part of the
binary would be wrong. `cargo-about` was the plan and was dropped — requiring a
build tool on every machine and every CI runner is a cost this avoids, since
cargo already reads the lockfile.

A list that cannot be generated **degrades rather than failing the build**. A
checkout with no `node_modules`, or an environment where `cargo metadata` cannot
run offline, produces a shorter list and a note saying what is missing and why.
The degradation is itself tested, because an untested fallback is a fallback that
does not work. A package declaring no license is listed as "not declared" rather
than omitted: an incomplete list that looks complete is the worse failure.

## 1L — Clone

**Built.** `src/lib/clone/`, mounted by `src/routes/+layout.svelte`.
Reached from the toolbar and from All repositories.

Bring a repository in: an address, a folder, and the exact path it will land at
shown before anything runs.

**A modal owned by the layout, not by a screen.** A clone survives navigation —
it takes minutes on a large repository, and pressing something in the nav rail
while it runs must not cancel it. A modal owned by a screen would go with the
screen.

**The clone goes through the `git` binary**, which is the point of the item: it
is the first operation that needs credentials, and credential helpers are
external programs resolved through config — the place OS keychain integration
already lives. `GIT_TERMINAL_PROMPT=0` still holds, so a repository whose
credentials no helper can supply fails with git's own message instead of hanging
on a prompt there is no terminal for. **GitLumiere never asks for a password
itself.**

**Everything that can be refused is refused before the process starts.** An
unusable address, a folder that is not there, a destination that already has
something in it: each is computed by `clone::plan` as the user types, and each
is knowable without the network. Telling somebody after a round trip what they
could have been told while typing is the failure this avoids. An existing
*empty* destination is allowed, because `git clone` allows it — matching git's
rule rather than inventing a stricter one is what makes a GitLumiere clone the same
as a command-line clone.

**Progress is git's, parsed rather than invented.** `git clone --progress`
writes each phase to stderr terminated by a carriage return rather than a
newline, and `clone::progress` reads one line at a time. A line it does not
recognise is still shown, so a change to a format git does not promise degrades
to "no percentage" rather than "no progress". The same reading is where a
failure's message comes from: stderr is both channels, and it is read here.

**Cancelling removes only what the clone created.** Whether the destination
existed is decided before the process starts and remembered; a directory the
user already had is left exactly as it was found, partial contents and all,
because that is not GitLumiere's to delete. The removal happens after the child is
reaped, never after the kill signal, or the two race and files reappear behind
it.

**A failed clone leaves no entry in the repository list**, and that falls out of
the existing design rather than needing a rule: the list is written by opening a
repository, and the clone offers to open only what succeeded.
