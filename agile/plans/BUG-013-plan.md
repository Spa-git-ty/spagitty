<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-013 — Plan

**Item:** [`agile/items/BUG-013-tab-strip-with-no-repository.md`](../items/BUG-013-tab-strip-with-no-repository.md)
**Branch:** `bugfix/BUG-013-tab-strip-with-no-repository` — the record only.
The fix itself is in `c071e76`.

*Backfilled from the commit and the code, after the identifier was found spent
in a source comment with no item behind it.*

## Approach

Finish the restore that `workspace.init()` starts.

The tab strip is interface state and comes back from `localStorage` on mount.
The session is backend state and comes back only when something calls
`repo.open`. The fix is to make the second follow the first, in the one place
that already runs after both are available — the shell's `onMount`.

Order matters, and it is the whole of the design:

1. **The launch path wins.** A path on the command line is what the person asked
   for a second ago; the stored session is what they were doing yesterday.
2. **Then `workspace.active`**, through `repo.open`, awaited — everything after
   it needs a repository that is actually open.
3. **Then the route**, with `goto`, so the window lands on the screen it was
   left on rather than on the graph.
4. **Then the selection**, with `graph.want`. After the route, because the graph
   store carries a wanted id across a walk whose end it cannot see; before the
   walk finishes is exactly when it has to be asked.

Every step checks `cancelled` first: an unmount partway through a restore must
not keep opening things.

### Why a failure keeps the tab

A stored path that no longer resolves is the common case — a repository moved,
an unmounted drive, a deleted clone. Dropping the tab would be tidy and would
lose the only record the user has of what they were working on. The tab stays,
`repo.error` says what happened, and All repositories marks it missing.

### Why only the active tab

The strip can hold several. Opening all of them at startup would walk several
histories before the window is usable, and nobody asked for that. The active tab
is what "where I left off" means.

## Files

`src/routes/+layout.svelte` — the mount sequence only. No store changed:
`workspace.active`, `workspace.placeOf`, `repo.open` and `graph.want` all
already existed and are called in the right order rather than rewritten.

## Testing

Manual, and the sweep says why: the logic is a sequence inside the shell's
`onMount`, and `src/routes/**` is outside the coverage scope precisely because
those files are shells. See the automated document for what would have to change
structurally for a unit test to be worth writing.

## Risk

Low, and bounded by the guards: a `cancelled` check between every step, a
failure path that keeps the tab, and no change to any store.

The one behaviour that could regress is the command-line path, which is checked
first and returns early. It is the first ticket in the sweep for that reason.

## Rollback

Remove the resume block. The window comes back with a tab strip and nothing
behind it, which is where this started.
