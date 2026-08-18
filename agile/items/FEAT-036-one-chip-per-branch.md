<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-036 — One chip per branch, with local and remote shown as icons

**Status:** implemented on `feature/FEAT-036-one-chip-per-branch`.
**Screen:** Graph (1A), and everywhere else `RefChip` is used.
**Requested by:** the author, 2026-08-18, with a GitKraken screenshot.
**Decision on record:** icons only, no remote name in the chip. Chosen by the
author over "icons plus the remote name on hover" and over keeping a text label
for additional remotes.

## Problem

A branch that exists locally and on a remote renders as **two chips**:
`main` and `origin/main`. The name is repeated, the word `origin` is spent on
something the user already knows, and a commit carrying three tracked branches
shows six chips.

`crates/gitlumiere-core/src/refs.rs:69-71` builds them independently:

```rust
let (kind, name) = if let Some(rest) = full.strip_prefix("refs/heads/") {
    (RefKind::Branch, rest)
} else if let Some(rest) = full.strip_prefix("refs/remotes/") {
    (RefKind::Remote, rest)
```

so `refs/heads/main` and `refs/remotes/origin/main` become unrelated `RefChip`s
that happen to sit on the same commit.

## Wanted

One chip per branch name, per commit:

```
✓ correzioni-e-rilavorazioni   💻 ☁
versione-14.0.0                💻
```

- `✓` when it is HEAD — already the current behaviour.
- The branch's short name, once.
- A **computer** glyph when a local `refs/heads/` ref exists.
- A **host** glyph per remote that has it, chosen from the remote's URL:
  GitHub, GitLab, Azure DevOps, Bitbucket, and a generic cloud otherwise.
- The word `origin` never appears.

## The case that does not merge, and why that is correct

A local branch and its remote counterpart only merge when they point at the
**same commit**. When they have diverged — `main` at A, `origin/main` at B —
they are on different rows and cannot share a chip.

This falls out of the existing architecture rather than needing special
handling: chips are already grouped per commit in `refs.rs` (`by_commit`), so
merging happens within a commit's own list. A diverged remote then naturally
appears on its own row carrying only the host glyph, which is also the correct
thing to show — it is exactly the information "your remote is somewhere else".

## Scope when started

- `RefChip` gains the shape the merge needs: the branch's short name, `local:
  bool`, and the remotes carrying it. `kind` stays for tags.
- Grouping in `refs.rs`, within a commit, keyed on the short name after the
  remote prefix is stripped.
- Remote URL → host identification. `shell.rs` is the process boundary; the
  remote list is read once per repository, not per chip.
- Icons in `RefChip.svelte`, inline SVG, currentColor, sized off `--fs-mono`.
- The ordering rule in `refs.rs:110-117` (current first, then locals, then
  remotes, then tags) is rewritten, since "remotes" is no longer a separate rank
  for anything that merged.
- Tags are untouched — they keep their notched, dashed treatment.

## Non-scope

- Fetching anything from the host. The glyph is derived from the configured
  remote URL; no network call, and the All repositories screen's promise that
  nothing leaves the machine is unaffected.
- Ahead/behind counts on the chip. That is FEAT-033's divergence work.

## Open question for when this starts

A repository with two remotes carrying the same branch (`origin` and a fork)
renders two host glyphs, and if both are GitHub they are identical. The author
chose icons-only knowing this; whether the second one needs disambiguating in
the `title` is decided when the case is actually seen.

## Acceptance criteria

- A branch present locally and on one remote renders as exactly one chip.
- A diverged local and remote render as two chips on their two commits.
- A local-only branch shows the computer glyph and no host glyph.
- A remote-only branch shows the host glyph and no computer glyph.
- The current branch still shows `✓` and the accent border.
- Tag chips are visually unchanged.
- Icons carry accessible text; the chip is not icon-only to a screen reader.

## Dependencies

Touches `RefChip.svelte`, which BUG-006 also changes. BUG-006 lands first; this
rebases onto it.
