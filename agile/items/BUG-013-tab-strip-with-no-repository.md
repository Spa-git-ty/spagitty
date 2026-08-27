<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-013 — The window comes back with a tab strip and no repository

**Status:** Fixed in `c071e76`, on `feature/FEAT-019-commit-signing`. Recorded
here on `bugfix/BUG-013-tab-strip-with-no-repository`.
**Screens:** chrome, and whichever screen the session was left on.
**Found by:** the author, restarting the application.

## Why this document exists at all

The fix landed inside `c071e76`, a commit whose subject is FEAT-056, and cited
`BUG-013` in a source comment:

```
src/routes/+layout.svelte:155
 * Otherwise, carry on where the last session left off (BUG-013).
```

That citation spent the identifier. No item, plan or test plan was written for
it, and `tools/record.test.ts` did not catch the gap because it reads `agile/`
and `docs/` and does not scan source comments — a number can be spent in code
without the record noticing.

The item is written now rather than the number being quietly reused. Amendment
12 does not allow reuse, and a repository where identifiers are handed out in
commit comments and never recorded loses the join between a fix and its reason,
which is the whole point of having them.

## Reproduction

1. Open a repository, so it appears in the tab strip.
2. Close Spagitty.
3. Start it again, with no path on the command line.

## Observed

The window comes back with the repository's name across the top and nothing
behind it. No HEAD, no counts, no walk, no rows. The tab is a label on an empty
session, and the only way out is the All repositories screen — the repository
has to be opened again by hand, from a tab that says it is already open.

## Expected

The session resumes: the repository is open, the graph is walked, and the window
lands on the screen and the commit it was left on.

## Cause

`workspace.init()` restores the tab strip from storage during mount, because the
strip is a piece of interface state. Nothing then told the backend to open what
the strip was showing. Two half-restores that never met: the tabs came back from
`localStorage`, the session did not come back at all.

## Fix

`src/routes/+layout.svelte`, in the mount sequence, after the launch path is
checked:

- A path on the command line still wins. It is what the person just asked for,
  and it is more specific than what they were doing last time.
- Otherwise `workspace.active` is opened through `repo.open`, and the stored
  place — route and selected commit — is restored after it: `goto` for the
  route, then `graph.want` for the selection, in that order, because the graph
  store holds a wanted id across a walk it cannot see the end of.
- A repository that has moved, been unmounted or been deleted leaves the tab in
  place rather than dropping it. `repo.error` says what happened and All
  repositories marks it missing. Silently discarding somebody's workspace
  because a path did not resolve is worse than showing them a repository they
  need to find again.

## Acceptance criteria

- A restart with no argument reopens the last active repository.
- The route and the selected commit come back with it.
- A path on the command line takes precedence over the stored session.
- A repository that no longer resolves keeps its tab and reports why.
- Nothing is opened when the strip is empty.

## Non-scope

Reopening every tab in the strip rather than the active one. Opening five
repositories at startup because five tabs are stored is a different decision,
and it is not this fix.

## Dependencies

FEAT-027, which added the tab strip, and the workspace store that persists it.
