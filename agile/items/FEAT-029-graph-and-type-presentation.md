<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-029 — Bigger faces, a bigger type scale, and a rail that scales with them

**Status:** Done, record backfilled
**Branch:** none — landed directly on `main` as `994dbe9`

## Problem

FEAT-023 put an author's portrait on each commit node, at a radius of 8.5px.
Seventeen pixels across is not a face: at that size a generated portrait reads as
a coloured dot, so the column costs the width of a face and delivers the
information of a colour swatch. The graph says *who* only if the reader can tell
who.

Three smaller problems travelled with it:

- The base type scale (`--fs-ui: 13px`) was tuned against a dense reference and
  reads small on a desktop window at a normal viewing distance.
- The navigation rail hardcoded `15px` for its glyphs and `12px` for its labels,
  so it was the one region of the chrome that ignored the text-size and zoom
  dials entirely — turning the dials up left the rail behind at its original
  size.
- Commit rows carried `border-radius: var(--r-row)`, which puts rounded corners
  on a selection highlight in a table of full-width rows. Adjacent selected rows
  showed a pinch between them instead of a continuous band.

And one correctness defect in the graph walk: a parent that had already been
visited was still allocated a lane, leaving an edge routed to a row that would
never be drawn.

## Scope

- Node radius 8.5 → 11, and the geometry that has to move with it: `ROW_PITCH`
  26 → 30, `LANE_PITCH` 22 → 26, `LANE_X0` 14 → 16, and the Rust `ROW_PITCH`
  mirror.
- The Author column's avatar, 1.6em → 2em.
- Type scale up 20% across `--fs-ui`, `--fs-secondary`, `--fs-mono`,
  `--fs-title`, `--fs-code`, in `app.css` and in `TYPE_BASE` in
  `scale.svelte.ts`.
- Font rendering: `subpixel-antialiased` with `text-rendering: optimizeLegibility`
  in place of `antialiased`.
- `NavRail.svelte` glyph and label sizes read `--fs-ui` and `--fs-secondary`.
- `border-radius` removed from `.row` in `CommitRows.svelte`.
- `LaneState` tracks visited commits and does not open a lane for a parent
  already walked.

## Non-scope

- Retuning `LANE_COLUMNS_MAX`. The cap stays at twelve; what changed is that at
  the enlarged node the twelve-lane column is 24px *wider* than the message
  column rather than narrower. See the trade-offs below.
- The merge-node radius. `MERGE_R` stays 4.5 while the portrait grew, so a merge
  now reads as a much smaller kind of event than it did. Deliberate.
- Any migration of a user's saved zoom or text-size factor to compensate for the
  larger base — the dials multiply the new base, so a user at 1.0 sees the change
  and a user at 0.9 still sees a larger UI than before.

## Acceptance criteria

- A portrait is identifiable as a face at 100% zoom without leaning in.
- Two adjacent commit nodes keep visible background between them at 100%.
- The rail's glyphs and labels change size with both dials.
- A run of selected rows draws as one continuous band.
- The frontend and Rust row pitches agree, and are held to agree by a test.
- Every gate green.

## Known trade-offs

Recorded so they are decisions rather than surprises:

1. **The five-lane column grew from 129px to 149px**, and the twelve-lane cap
   from 318px to 331px. At the cap the graph now takes 24px more than the
   message column at a 1280px window, reversing the balance FEAT-022 chose the
   cap for. Accepted: dropping to eleven lanes to restore the balance costs a
   whole lane of history, which is worth more than 24px of message.
2. **The 20% type bump is hardcoded as fractional pixels** — `15.6px`, `13.2px`,
   `19.2px`, `14.4px` — duplicated between `app.css` and `TYPE_BASE`. The
   existing text-size dial already applies a factor to the same tokens, so the
   same idea now lives in two mechanisms and the source numbers no longer read
   as design decisions. Left as it is, flagged as debt.
3. **`LaneState.visited` grows for the length of the walk** — one `ObjectId`
   (20 bytes plus hashing overhead) per commit, so roughly 20MB of raw ids on a
   million-commit history. No repository the app currently targets comes close,
   and the walk is capped elsewhere; worth revisiting if a walk ever becomes
   unbounded.

## Dependencies

- Builds on FEAT-023 (portraits on nodes) and FEAT-022 (the lane cap).
- Landed in the same commit as TASK-004, which is why it has no branch of its
  own. That coupling is recorded as a defect under BUG-005.
