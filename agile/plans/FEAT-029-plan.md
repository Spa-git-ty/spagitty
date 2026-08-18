<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-029 — Plan

*Backfilled after the fact. This records the approach the change actually took.*

## Decisions

**The node sets the geometry; everything else follows.** `NODE_R` is the only
number chosen by eye. The rest are consequences of it, and `src/lib/metrics.ts`
is where that chain is written down:

| Constant | Derivation |
| --- | --- |
| `LANE_PITCH` 26 | must clear `2 × NODE_R + LANE_STROKE` = 24.5, plus daylight |
| `ROW_PITCH` 30 | must clear `2 × NODE_R` = 22 with room for the row's text |
| `LANE_X0` 16 | at least `NODE_R`, or lane 0's portrait is clipped by the column edge |
| `LANE_COL_W` 149 | `LANE_X0 + 4 × LANE_PITCH + NODE_R + LANE_TAIL` |

Changing `NODE_R` without walking that table is how the drift in BUG-005
happened.

**The Rust mirror moves in the same commit.** `crates/gitlumiere-core/src/graph.rs`
describes lane elbows in row units, so its `ROW_PITCH` must equal the
frontend's. It was updated by hand here; BUG-005 adds the test that makes the
next such edit impossible to get wrong.

**The rail reads tokens instead of pixels.** `NavRail.svelte` is the only place
that had opted out of the scale system. The fix is not to pick better numbers
but to stop having numbers: `var(--fs-ui)` and `var(--fs-secondary)` are already
published by `applyMetrics` at the current zoom and text factor.

**Rows lose their radius rather than gaining a fix.** A full-width row in a table
is not a card. Removing `border-radius` is the whole change; nothing needs to
special-case the first or last row of a selected run.

**A walked commit cannot be awaited.** `LaneState` gains a `HashSet<ObjectId>`
of visited ids and consults it before allocating a lane for a parent. The
alternative — reconciling after the fact when the parent turns out to have been
drawn — needs the row already emitted, which is exactly what a streaming walk
does not have.

## Files

| File | Change |
| --- | --- |
| `src/lib/metrics.ts` | `ROW_PITCH`, `LANE_PITCH`, `LANE_X0`, `NODE_R` |
| `crates/gitlumiere-core/src/graph.rs` | `ROW_PITCH` mirror; `visited` set in `LaneState::step` |
| `src/app.css` | Type scale +20%, font smoothing |
| `src/lib/scale.svelte.ts` | `TYPE_BASE` mirrors the new scale |
| `src/lib/chrome/NavRail.svelte` | Glyph and label sizes read tokens |
| `src/lib/graph/CommitRows.svelte` | Avatar 2em; `.row` radius removed |

## Risk

- **Geometry drift.** Four constants that must move together, and a fifth in
  another language. This risk materialised: see BUG-005.
- **The lane cap's rationale silently expires.** `LANE_COLUMNS_MAX` was chosen as
  the widest cap that still left the message column wider; the enlarged node
  moves that crossover to eleven. The cap is kept, and the comment above it now
  says so instead of claiming the old reason.
- **`visited` is unbounded.** Bounded in practice by the walk cap; noted in the
  item.
- **`subpixel-antialiased` is a per-platform gamble.** It sharpens text on an
  opaque LCD surface and can fringe on a translucent or rotated one. The app
  paints an opaque background everywhere, so the condition holds — but it is a
  visual judgement, which is why it gets a sweep ticket rather than a test.

## Rollback

Revert the geometry constants to 26/22/14/8.5 and the Rust mirror to 26; revert
`TYPE_BASE` and the five `--fs-*` tokens. The `visited` fix, the rail tokens, and
the row radius are independent of the geometry and can each be reverted alone.
Reverting `994dbe9` wholesale also reverts TASK-004's rename, which is not what
anyone would want.
