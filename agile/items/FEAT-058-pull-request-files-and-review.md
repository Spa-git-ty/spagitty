<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-058 — A pull request you can read and answer

**Status:** Done.
**Screen:** 1H — Pull requests.
**Raised by:** the author: "in PRs allow me to open it's files and view them and
add review process to the PR tab".

## Problem

The Pull requests screen lists what is waiting and says nothing about what is
in it. A row carries a title, a branch pair, a review state and `7 files · +120
−34` — every fact except the one a reviewer needs, which is what changed. Both
buttons on the detail panel were disabled and said reviewing needs a connected
account, which stopped being true when FEAT-017 connected one.

So the screen tells somebody a pull request is waiting on them and then gives
them nowhere to go but a browser. That is a notification, not a review.

## Change

**The files, read from the host.** `forge/review.rs` reads
`/repos/{owner}/{name}/pulls/{n}/files`, paginated, and parses each entry's
unified patch into the `FileDiff` and `Hunk` the rest of the application
already renders. The detail panel lists the paths with their counts, and
opening one renders it in `DiffPane` — the Diff screen's own component, not a
second renderer that would have to be kept in step with it.

**The review, written to the host.** `/pulls/{n}/reviews` with a verdict and a
comment. Three verdicts, in Spagitty's words — comment, approve, request
changes — mapped onto the host's at the edge, the way `ReviewState` already is.

**REST here, where the list is GraphQL.** Both choices are the request count
and nothing else. The list is one GraphQL query because REST would be 1 + 3N.
These two are REST because GraphQL's `files` connection has no field for the
patch — a GraphQL route would list the files and then need a REST call each to
show any of them — and because a review mutation would first have to fetch the
pull request's node id.

**The diff is the host's, not a local one.** A pull request's head branch is
usually not fetched. Fetching it in order to list some files would turn opening
a review into a network operation against the repository, and would fail
outright for a fork. The host has already computed this diff.

**One credential path, not three.** `forge_credentials` in `commands.rs` now
holds the session-then-accounts-then-keychain sequence that `pull_requests` had
inline; the three commands share it. The ordering matters — everything local
happens before the await, because a lock must never be held across one — and it
is now written once.

## Acceptance criteria

- Opening a pull request lists its files with per-file counts, and selecting
  one shows its diff.
- A file the host sends no patch for is marked rather than shown as a file that
  changed nothing.
- Approving, requesting changes and commenting all reach the host, and the list
  is re-read afterwards rather than patched locally.
- A verdict the host would reject for want of a comment is refused here first,
  with a sentence saying what is missing.
- A review is confirmed before it is sent, and the confirmation names the
  verdict.
- Selecting a different pull request never shows the previous one's files.
- A slow file read that lands after the reader has moved on is dropped.
- Every promise in `requests.test.ts` still holds: no host's name on the screen,
  no network call from the webview, no token anywhere in it.

## Non-scope

- **Merging.** Still not built, and the button still says so rather than
  pretending. It is a different decision with a different blast radius, and it
  wants its own item.
- **Line comments.** A review here carries one body. Commenting on a line means
  a position in a diff the host computed and a thread model to render, which is
  a feature rather than a field.
- **Other hosts.** GitHub only, like everything else behind `forge/`. The
  vocabulary is host-agnostic so that a second one is a module rather than a
  rewrite.
- **Draft reviews, or editing one already submitted.** Submitting is the whole
  of it.

## Dependencies

FEAT-010 built the screen's shape; FEAT-017 connected the account and built the
HTTP path this uses. `DiffPane` and the `FileDiff` shape come from FEAT-002 and
were reused unchanged, which is what made this small.
