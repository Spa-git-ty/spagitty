<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-004 — Plan

## Approach

One new core module, `branches.rs`, producing the screen's rows in a single
call, plus two writes routed through `shell.rs`. The whole list arrives at once:
a repository with a thousand branches is a rounding error beside its history, so
filtering belongs in the frontend rather than in a narrower question to the
core.

## Decisions

**Ahead and behind are `git rev-list --count` in `gix` terms.** `rev_walk(tip)`
with the other side `with_hidden` counts exactly the commits one has and the
other does not. No merge-base arithmetic of our own, which would be a second
implementation of something gix already does correctly.

**Merged means "an ancestor of `HEAD`", tested by the same walk.** A branch with
nothing of its own reachable from `HEAD` is a branch whose deletion loses
nothing. The test compares every row against `git branch --merged` rather than
asserting a hand-picked list.

**`switch`, not `checkout`.** `git checkout` is overloaded: with a `--` it
restores paths, without one it guesses between a branch and a revision. `switch`
only ever changes branch, so a branch whose name looks like a path cannot be
misread as one.

**Name validation is git's.** `git check-ref-format` already knows every rule,
and its refusal names the actual problem. A second implementation could only
disagree with it, so the core sends the name through and surfaces what comes
back.

**A remote-tracking row offers "Branch from it", not "Check out".** Checking out
a remote-tracking ref detaches `HEAD`, which is almost never what someone
clicking a row in a branch list means.

**The branches command re-opens the repository.** `gix` reads config once, when
a repository is opened, and a branch's upstream lives in config. Reusing the
session handle meant a `--set-upstream-to` run while GitLumiere was open stayed
invisible, and the screen reported "no upstream" for a branch that had one —
caught in the visual sweep, not by a test. Re-discovery costs one directory
walk; being quietly wrong about drift costs more.

**`mine` means local, and says so.** The design handoff names the chip "mine",
but GitLumiere does not know who you are until Settings does, and a guess would be
wrong for anyone who commits under more than one identity. The chip keeps the
handoff's word and carries a title explaining what it actually filters.

**Stale is ninety days.** Long enough that a branch someone is working on is
never labelled abandoned, short enough to catch the ones that were.

## Files

- `crates/gitlumiere-core/src/branches.rs` — new
- `crates/gitlumiere-core/src/shell.rs` — `checkout`, `create_branch`
- `src-tauri/src/commands.rs`, `lib.rs` — three commands
- `src/lib/types.ts`, `src/lib/api.ts`
- `src/lib/branches/{store.svelte.ts,BranchTable.svelte}`
- `src/routes/branches/+page.svelte` — replaces the `ScreenStub`

## Risks

- **Ahead/behind is as old as the last fetch**, and a number that looks live but
  is not is worse than no number. The footer says so whenever any row has an
  upstream.
- **A checkout can fail halfway** in git's own hands; it is git's message that
  is surfaced, and the screen re-reads everything afterwards either way.
- **Deleting is absent, not hidden.** A screen that shows what is safe to remove
  and offers no way to remove it should say that is what it is doing, so the
  Delete control renders as a disabled label with its reason.

## Rollback

Revert the commit. Nothing else depends on the module; the route returns to its
`ScreenStub`.
