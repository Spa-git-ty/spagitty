<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-040 — Plan

**Item:** [`agile/items/FEAT-040-graph-footer.md`](../items/FEAT-040-graph-footer.md)
**Branch:** `feature/FEAT-040-graph-footer-facts`
**Status:** implemented.

**Branch point.** Cut from `feature/FEAT-044-tabs-row` rather than from `dev`,
because the footer it edits sits inside the shell FEAT-043 and FEAT-044
rearranged, and rebasing it onto `dev` would conflict in `+page.svelte` twice
over. The deviation from Amendment 13 is recorded here, as it is in the other
plans of this stack: the branches merge in order, oldest first.

## Approach

The footer stops instructing and starts reporting. Three facts replace two
hints, and each one is either already on the screen or is read honestly from
git rather than invented.

```
before                                          after
  drag a branch onto another to merge…            17 changed files
  right-click a row for the full menu · …         refreshed 2 minutes ago · fetched 3 hours ago
```

### The changed-file count is the count that already exists

`repo.counts.working` — the same number the rail carries and the Working copy
screen shows. Reading it here rather than counting again is what makes the
acceptance criterion "matches the Working copy screen's own count, always" a
structural fact rather than something to keep in step by hand. `null` is a
working copy that has not been read yet, and says so.

### The refresh time belongs to the walk

`graph.refreshedAt` is set in the store when a `done` payload arrives with
`complete: true`, and reset by `reset()`. Not when the process started, not when
the last row arrived, and not on a cancelled or errored walk — a walk that did
not finish refreshed nothing, so the footer says `walking…` instead of dating
something that did not happen.

### The last fetch has no source, so one is added

Nothing in `Snapshot`, `RepoInfo` or `RepoCounts` knew when a fetch last
happened, so this half is a Rust change rather than a frontend one.

`repo::last_fetched` reads the mtime of `.git/FETCH_HEAD`. Alternatives
considered and rejected:

- **Reflogs of the remote-tracking refs.** They date only the refs that
  *moved*. A fetch that brought nothing down — the common case, and precisely
  the case where a person wants to know how stale the graph is — would report
  as never having happened.
- **Recording our own fetches.** Only fetches made through this application
  would count; one made in a terminal, which is most of them, would not. The
  footer would then be confidently wrong rather than merely coarse.
- **`FETCH_HEAD` contents.** They name the refs of the last fetch but carry no
  time. The mtime is the time.

`FETCH_HEAD` absent means never fetched — a fresh `git init`, or a clone whose
`FETCH_HEAD` was never written — and `None` travels to the frontend as
`lastFetched: null`, which the footer says in words. A time before the epoch
also gives `None`: an impossible clock is not worth propagating as a negative
age.

### The ages do not tick

`now` is a `$state` re-read by an `$effect` that depends on `graph.refreshedAt`,
`repo.counts.working` and `repo.info?.lastFetched` — the three things that can
move the numbers behind the text. Nothing polls. A footer that counted seconds
would pull the eye to the least important row on the screen, and the strings
`relativeTime` produces are coarse enough that a timer would mostly re-render
the same words.

## Files

`crates/spagitty-core/src/repo.rs` — `last_fetched`, `RepoInfo.last_fetched`,
and two tests.
`src/lib/types.ts` — `RepoInfo.lastFetched: number | null`, with what `null`
means written where the type is.
`src/lib/graph/store.svelte.ts` — `refreshedAt`, set on completion, cleared by
`reset`.
`src/routes/+page.svelte` — the footer, the three derived strings, and the
`.dot` separator.
`src/lib/graph/store.test.ts` — the walk-dating tests and the footer assertions.
`src/lib/chrome/chrome.test.ts`, `src/lib/repo.test.ts`,
`src/lib/graph/CommitDetail.test.ts`, `src/lib/repos/RepoCard.test.ts`,
`src/lib/repos/store.test.ts` — `lastFetched: null` in the `RepoInfo` fixtures,
because the field is not optional.

## Testing

Rust covers the new read directly: a repository with no `FETCH_HEAD` reports
`None`, and one with a `FETCH_HEAD` written a moment ago reports a stamp within
a minute of now. Both assert through `info()` as well as through
`last_fetched()`, so the wiring is covered and not just the function.

The store tests date a completed walk and refuse to date a cancelled one. The
footer itself is markup in a route, and routes are not mounted by this suite, so
its four assertions read `+page.svelte` as text: that the two hint lines are
gone, that the three facts are named, and that the never-fetched and unread
cases have words.

## Risk

Low, and confined to what the footer says.

The one judgement worth naming is that `FETCH_HEAD`'s mtime is a *file* time,
not a git fact: anything else that writes that path — another tool, a restore
from backup, a `touch` — moves the number. Nothing in normal use does, and the
alternatives are wrong more often, but the sweep asks a person to confirm the
number moves on a real fetch and only on a real fetch.

## Rollback

Revert the branch. Nothing persists, no schema changes, and `last_fetched` reads
a file git already maintains.
