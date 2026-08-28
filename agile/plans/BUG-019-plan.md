<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-019 — Plan

**Item:** [`agile/items/BUG-019-closing-the-last-tab-leaves-the-repository-open.md`](../items/BUG-019-closing-the-last-tab-leaves-the-repository-open.md)

## Approach

Two lines of behaviour, in the two places that were each half-written.

**The caller learns what "nothing left" means.** `closeTab` gets the branch it
never had: if a tab remains, switch to it; if none does, close the repository.
Written as an early return on `wasActive` followed by an if/else, so the two
outcomes of "the tab that was showing has gone" sit side by side and neither can
be the one nobody wrote.

**`repo.close()` moves the generation.** `open()` bumps it and everything keyed
to it re-syncs; `close()` is the same kind of event and was not saying so. With
the bump, the shell's effect restarts the walk, `graph.restart()` resets and
returns because there is no token, and the screens that cache per repository
notice. Without it, the store would be empty and every screen still full.

## The test double that made this unwritable

Worth recording, because the reason no test caught a missing call is that no
test *could*.

`src/testing/repo-store.svelte.ts` had:

```ts
async close() {
    calls.closed += 1;
    control.reset();
}
```

`control.reset()` clears the state **and the call counters**, including
`calls.closed`. So the double incremented the counter and immediately wiped it,
and `expect(repoCalls.closed).toBe(1)` could never pass however correct the code
was. The one assertion that would have caught this was unwritable against the
scaffolding.

`close()` now clears only the state — info, token, counts, and the generation,
mirroring the real store. Resetting counters stays with `control.reset()`, which
the suite calls between tests, which is the only place it belongs.

This cost real time during the fix: the code was correct and the test still
failed, which reads as a wrong diagnosis rather than a lying double.

## Alternatives considered

**Have `workspace.close` close the repository itself.** Fewer moving parts at
the call site. Rejected: the workspace store owns the strip and deliberately
knows nothing about what a repository is — its own comment says "the repository
is untouched … only this session's tab goes". Teaching it to close one would
give it a second responsibility and a dependency it has stayed clear of.

**Bump the generation from the caller rather than inside `close()`.** Rejected
for the same reason it is not done for `open()`: whoever changes which
repository is open is the one who has to say so, and leaving it to callers means
the next caller forgets.

## Files

- `src/lib/chrome/RepoTabs.svelte` — the missing branch.
- `src/lib/repo.svelte.ts` — the generation bump and the note saying why.
- `src/testing/repo-store.svelte.ts` — the double that could not report a close.
- `src/lib/chrome/chrome.test.ts` — the tests, and a `path` parameter on the
  `info` helper so a second repository can be described.

## Risks

**Something else may rely on the generation not moving on close.** Everything
keyed to it treats a change as "re-read against the current repository", and the
current repository is now none, which every one of those paths already handles
because it is the state at startup. Covered by running the whole suite rather
than the touched files.

## Rollback

Two lines of behaviour and their tests. Reverting restores the leak.
