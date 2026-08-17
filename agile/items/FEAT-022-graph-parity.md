<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-022 — The graph as a launcher, not a report

**Status:** Built. Plan in `agile/plans/FEAT-022-plan.md`, tests in
`agile/testing/FEAT-022-automated.md` and `-sweep.md`.
**Surface:** the Graph screen (`/`), the shell's dialog and notice layers, and
the command palette.
**Depends on:** FEAT-001 (the graph screen), FEAT-021 (the visual system whose
tokens every new surface here draws through).

## Problem

GitLumiere's graph drew the history correctly and did nothing else. Everything the
graph is actually *for* in a desktop client — branching from a commit you can
see, resetting to it, cherry-picking a run of commits, getting a large
repository down to the branches you care about — lived somewhere else or lived
nowhere.

Three specific gaps, each of which makes the graph a worse answer than
`git log --graph`:

1. **No operations.** Right-clicking a commit or a label did nothing. Every
   verb the graph could offer had to be reached from another screen, which
   means finding the commit twice.
2. **No noise control.** The walk was always every local and remote branch. A
   real repository's truthful graph is unreadable by default; without hide,
   solo, smart visibility and a pinned lane, the graph is honest and useless.
3. **No table.** One fixed set of columns, no author, no date, no SHA, no
   resize, no reorder, nothing remembered per repository.

Alongside these, work started under FEAT-021 left two shell-level surfaces
half-built: `actions.ts` asked questions through a `Dialog` and reported through
a `Notice` that no screen mounted, and `+layout.svelte` imported a palette
command registry that was never written — so the project did not typecheck.

## Motivation

The reference is GitKraken, whose graph is documented in
`docs/reference/gitkraken-commit-graph.md`. The lesson worth taking from it is
not the feature list: it is that **the graph is the primary navigation surface**.
Almost every operation is reachable from a right-click on a node, which is what
makes the graph worth looking at rather than a picture beside the real controls.

The second lesson is that noise control is a first-class feature, not a setting.
A graph that shows everything is only readable on toy repositories.

## Scope

**Operations, from the graph.**

- On a commit: create branch here, create tag here, reset (soft/mixed/hard,
  named by effect), revert, cherry pick, rebase onto this commit, checkout
  (detached), copy SHA.
- On a branch label: merge, rebase, fast-forward, rename, delete, pin to left,
  hide, solo.
- Drag a branch label onto another: a menu offering merge, rebase or
  fast-forward, with the gesture carrying the direction.
- Multi-select — shift for a range, ctrl/cmd for individuals — then cherry-pick
  the group, or rebase the range onto a target branch.
- Repository-wide: fetch, push.

**Noise control.**

- Hide, solo, and show-all, kept per repository.
- Smart branch visibility: the checked-out branch, what it is based on, and
  their upstreams.
- Pin to left: a reserved lane so a long-lived branch holds its column.
- Author filter on the AUTHOR column, which **dims** rather than removes.
- Hover a branch label to highlight its commits; hover a bare commit for a
  ghost branch to the nearest reference.

**The table.**

- Columns: Branch/Tag, Graph, Commit Message, Author, Date/Time, SHA.
- Toggle from the header's right-click menu, drag to reorder, drag a divider to
  resize. Saved per repository.
- Author avatars: initials on a lane colour, computed locally.

**Everything else.**

- A command palette (`Ctrl/Cmd+P`) with a registry features contribute to.
- Layered text size (90–130%) and interface zoom (100–200%).
- `Dialog` and `Notice` mounted once in the shell.
- Lane geometry retuned against the reference.

## Non-scope

Stated so the absences are decisions rather than oversights, and matching what
the reference itself refuses to do:

- **No dragging commits.** Reordering lives in the Interactive Rebase screen
  (FEAT-009). A commit cannot be dragged to another branch.
- **No inline commit-message editing.** Amend covers the latest commit; older
  ones need an interactive rebase.
- **No manual layout.** Lanes and routing are computed. Pin-to-left is the only
  lane control.
- **No independent graph zoom.** The zoom scales the whole interface.
- **No multi-repository graph.**
- **No fetched avatars.** Initials, computed locally — see the reasoning in
  `src/lib/graph/avatar.ts`.

## Acceptance criteria

1. Right-clicking a commit offers every operation listed under Scope, and each
   one that cannot run right now is shown disabled with its reason.
2. Destructive operations are named by effect and confirmed through `Dialog`
   before they run; every operation reports through `Notice`, success or
   failure.
3. Dragging one branch label onto another offers merge, rebase and fast-forward,
   and applies them source-onto-target.
4. Multi-select cherry-picks a group and rebases a range onto a branch.
5. Hide, solo, smart visibility and pin-to-left each change what the walk roots
   at, and survive closing and reopening the repository.
6. Every filtered state is visible from the graph header and reversible from
   the gear menu without knowing what was hidden.
7. Column choice, order and widths persist per repository.
8. The author filter dims non-matching rows and never removes them.
9. `Ctrl/Cmd+P` opens a palette that reaches every shell command by initials.
10. `npm run check` reports zero errors and zero warnings; `npm test` and
    `cargo test --workspace` pass; first-party coverage stays above the
    Amendment 10 floor of 70%.
