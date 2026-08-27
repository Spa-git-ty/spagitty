<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-006 — A long branch name overlaps the branch count on a repository card

**Status:** Fixed on `bugfix/BUG-006-repo-card-overlap`.
**Screen:** All repositories (1J).
**Reported by:** the author, 2026-08-18, with a screenshot.

## Problem

On the All repositories screen, a repository whose checked-out branch has a long
name renders that name over the top of the "N branches" count beside it. The two
pieces of text occupy the same pixels and neither is readable.

## Reproduction

1. Open the All repositories screen.
2. Have a repository whose current branch name is longer than the card is wide —
   the reported case was `correzioni-e-rilavorazioni` on a card also showing
   `7 branches`.
3. The branch chip's border and text run into and over the count.

Reproduces at the default window size and text scale. Not platform-specific: it
is a layout rule, not a font or a renderer difference.

## Observed versus expected

| | |
| --- | --- |
| **Observed** | The chip renders at its full content width, overflowing its container and painting over the "7 branches" span beside it. |
| **Expected** | The chip truncates with an ellipsis at whatever width is left after the count, and the count stays fully readable. The full name remains available in the chip's `title`. |

## Cause

Not the ellipsis rules — those were already correct. `RefChip.svelte` declares
`white-space: nowrap`, `max-width: 100%`, `overflow: hidden` and
`text-overflow: ellipsis`, which is everything the effect needs *except* one
thing.

The chip sits inside `.branch`, which is `display: flex`. **A flex item's
`min-width` defaults to `auto`, and the used value of `auto` is the item's own
content width.** That automatic minimum size outranks `max-width: 100%`: the
chip is never allowed to become narrower than its text, so it never shrinks, the
ellipsis never engages, and the overflow paints over its sibling.

`.branch` itself already carried `min-width: 0`, which is why this looked like it
should already work. The missing `min-width: 0` was on the chip, one level down.

The same latent defect existed anywhere else a `RefChip` is a flex item; it was
simply most visible here because the card has a fixed width
(`--repo-card-w`) and therefore no slack to absorb it.

## Environment

Present on `main` at `3d14f22`. Linux, and every other platform — the rule is
in the stylesheet.

## Scope

- `min-width: 0` on `.ref` in `src/lib/ui/RefChip.svelte`, fixing every use of
  the chip rather than only this screen.
- `flex: none` on the branch count in `src/lib/repos/RepoCard.svelte`, so the
  name is what gives way and the count is never the thing truncated.
- A regression test that fails without the fix.

## Non-scope

- `.path`'s `direction: rtl`, flagged during triage as the other classic source
  of visual overlap. It is not what the reported screenshot shows, and changing
  a rule that is not implicated would be a guess with its own regression risk.
  If a path is later seen overlapping, that is its own item.
- Any redesign of the card's layout. This is a one-rule defect, not a layout
  problem.

## Acceptance criteria

- A branch name longer than the card truncates with an ellipsis; the count stays
  whole and readable.
- The full branch name is still reachable through the chip's `title`.
- A test asserts the rule and fails when it is removed.

## Dependencies

None. Sequenced after TASK-005 only so that gate 3 is already green underneath
it — see the plan.
