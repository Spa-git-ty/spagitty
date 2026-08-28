<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-036 — Plan

**Item:** [`agile/items/FEAT-036-one-chip-per-branch.md`](../items/FEAT-036-one-chip-per-branch.md)
**Branch:** `feature/FEAT-036-one-chip-per-branch`
**Status:** implemented, in `00caeea`.

*Backfilled by TASK-013 from the branch, the commit and the tests. It is a record
of what was done and why, written afterwards; where the reasoning is recovered
from the commit message rather than from notes made at the time, it says so.*

## Approach

Merge in the backend, per commit, and let divergence fall out of the grouping.

`refs.rs` already grouped chips by the commit they point at (`by_commit`). That
grouping is the whole trick: a local branch and its remote-tracking ref can only
merge when they are on the same commit, which is exactly when they are the same
thing. Nothing has to detect divergence, because a remote that has fallen behind
is on a different row and never meets its local branch in the first place.

So the change is:

1. **`RefChip` gains the shape the merge needs** — the short name once, `local:
   bool`, and a list of remotes each carrying a `Host`. `kind` stays, because a
   tag is still a different thing.
2. **Grouping inside a commit's own list**, keyed on the short name with the
   remote prefix stripped. The name splits at the **first** slash, so
   `origin/feature/x` is `feature/x` on `origin` — not `x` on `origin/feature`.
3. **Host per remote, read once per index build** from the repository's config,
   in `remote_hosts`. `Host::from_url` reads the URL's *authority*, and handles
   the three forms git accepts: `https://`, `ssh://`, and the scp-like
   `git@host:path`.
4. **Ordering rewritten.** The old rank was current, locals, remotes, tags;
   "remotes" stops being a rank of its own for anything that merged.
5. **Glyphs in `RefChip.svelte`** — inline SVG, `currentColor`, sized off
   `--fs-mono`, `aria-hidden`, with the `title` carrying the whole sentence.

### Why the host is read, never contacted

The All repositories screen promises that nothing leaves the machine. Deriving
the glyph from the configured remote URL keeps that promise; asking the host what
it is would spend it on drawing an icon. An unrecognised host gets a plain cloud
rather than a guess.

### Why counts stay per ref

The rail reports how many branches and remote-tracking branches a repository
has. Merging two refs into one chip is a presentation decision and must not
quietly halve either number, so `counts()` keeps counting refs.

### Why the authority, not a substring

A first implementation searched the URL for `github.com`, which makes
`https://git.example.com/mirrors/github.com/o/r.git` GitHub. A test insisted on
the authority instead. Recovered from the commit message.

## Files

`crates/spagitty-core/src/refs.rs` — the merge, `Host`, `remote_hosts`,
ordering, and the Rust tests.
`src/lib/types.ts` — the `RefChip` shape and `Host`.
`src/lib/ui/RefChip.svelte` — the glyphs and the title.
`src/lib/repos/RepoCard.svelte`, `src/lib/stash/StashList.svelte` — callers
following the shape change.
`src/lib/graph/highlight.test.ts`, `rows.test.ts`, `src/lib/search/panes.test.ts`
— fixtures following the shape change.

## Testing

Rust for the merge, since the merge is a backend decision and the fixtures there
can build real repositories; frontend for the drawing and the accessible text.
Both halves are listed in `FEAT-036-automated.md`.

## Risk

Medium. `RefChip` is drawn on the graph, on repository cards, in the stash list
and in search results, so a shape change reaches most of the app — which is why
the callers and their fixtures move in the same commit and `npm run check` is
part of the evidence.

The behaviour risk is a merge that hides something: two branches that are *not*
the same branch collapsing into one chip. The key is the short name within a
single commit, and a tag never merges with a branch of the same name — pinned by
its own test.

## Rollback

Revert the branch. The chip shape is internal; nothing persists it.
