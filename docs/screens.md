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
| 1C | Working copy | `/changes` | yes | Stub | FEAT-003 |
| 1D | Conflicts | `/conflicts` | yes | Stub | FEAT-008 |
| 1E | Interactive rebase | `/rebase` | yes | Stub | FEAT-009 |
| 1F | Branches | `/branches` | yes | Stub | FEAT-004 |
| 1G | Stash | `/stash` | yes | Stub | FEAT-005 |
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

**Stub.** Planned in FEAT-003. Route `/changes`; the toolbar's primary Commit
button points here.

Stage what you mean to commit, write the message, commit. Message box, staged
and unstaged columns, hunk pane with per-hunk staging. Its status walk is what
will fill the rail's Working copy and Conflicts counts, which are `·` today.

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

**Stub.** Planned in FEAT-004; delete and rename deferred to FEAT-013.

Every branch, how far it has drifted, and what is safe to forget. Merged
branches render dashed.

## 1G — Stash

**Stub.** Planned in FEAT-005; pop, apply and drop deferred to FEAT-014.

Stash entries drawn hanging off the commit each was made on, with its diff.
The rail's Stash count is already real — it comes from the reflog of
`refs/stash` in `crates/gitlord-core/src/status.rs`.

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
