<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-023 — Author heads on the graph, and a graph column of its own

**Status:** Done. Plan in `agile/plans/FEAT-023-plan.md`, tests in
`agile/testing/FEAT-023-automated.md` and `agile/testing/FEAT-023-sweep.md`.
**Screen:** Graph (1A).

## Problem

Measured against the reference screenshot the author supplied, the lane column
read as scaffolding rather than as the graph:

1. A node was a 5.5px disc with two letters in it. At that size the letters are
   unreadable and the node says nothing about who wrote the commit.
2. Lane lines were thin and their elbows short, so a crossing looked like a
   kink rather than a sweep.
3. The column had no surface of its own — it was the same background as the
   rows, so the graph floated in the table instead of being a part of it.
4. Hovering a branch label dimmed every commit outside that branch, and
   hovering a row drew a dashed ghost line to its nearest reference. Both fire
   on a pointer that is only passing through, so the screen flickered as the
   mouse crossed it.

## Decisions the author made

- **No Gravatar, and no fetched picture of any kind.** Asked directly, with the
  costs stated: a request per distinct author on the app's most
  performance-sensitive screen, the repository's committer list handed to a
  third party (the hash identifies the person), and a different-looking graph
  offline. The answer was to generate locally.
- **The graph column becomes its own surface**, rather than tinting each row
  with its lane colour.
- **All hover dimming goes.** The author filter keeps its own dimming; it is a
  standing question the user typed rather than a side effect of where the
  pointer happens to be.

## What was built

- `src/lib/graph/portrait.ts` — a portrait generated from the author's email:
  Boring Avatars' *marble* construction rebuilt over the theme's own lane
  palette, deterministic, offline, identical on every machine. One description,
  two renderers: canvas for the graph, CSS radial gradients for the Author
  column, so the two can never disagree about a person's face.
- Portraits are rendered once per author into an offscreen tile at device
  resolution and cached, keyed by palette so a theme change replaces them.
- `crates/gitlumiere-core/src/graph.rs` carries `author_email` on every row,
  because the address is what identifies a person across the several names one
  human commits under.
- Geometry retuned in `src/lib/metrics.ts`: node radius 5.5 → 8.5, lane pitch
  15 → 22, lane stroke 2 → 2.5, elbow control points 0.40/0.34 → 0.55/0.45, and
  a new `MERGE_R` of 4.5.
- Merges are plain dots. A merge is the moment two lines join rather than one
  person's work, and putting the merge author's face on it would claim they
  wrote the branch it swallowed.
- The lane column paints `--graph-bg`, a mix of `--panel` and `--bg` derived per
  theme, with a hairline down each side. Each row paints its own slice so the
  fill scrolls with the rows rather than lagging them by a frame.
- Hover dimming and the ghost branch are gone. `ancestry`, `ghostPath` and
  `rowOfRef` went with them — moved to `~/claudetrashbin/gitlumiere-FEAT-023/`
  with their tests under Amendment 6, not deleted.

## Acceptance criteria

1. Every ordinary commit's node is a portrait generated from the author's
   email; the same address gives the same face every launch. ✔
2. No network request is made for an avatar, ever. ✔
3. A merge is a small dot in the lane colour, not a face. ✔
4. The Author column shows the same face as the node. ✔
5. Lane lines are thicker and their crossings are smooth curves. ✔
6. The lane column has its own background, bounded by a hairline. ✔
7. Hovering a branch label or a row dims nothing and draws no ghost line. ✔
8. The author filter still dims. ✔

## Cost, accepted deliberately

The lane column for five lanes goes from 96px to 129px. FEAT-022 had taken it
down from 150px because the graph was crowding the messages; a third of that
comes back, because a face needs room. The message column is still the wider of
the two at five lanes.

## Non-scope

- Fetched pictures of any kind (above).
- A taller row pitch. The reference's rows are looser; `ROW_PITCH` stays 26
  until the author asks.
- Reworking the author filter's dimming.

## Dependencies

FEAT-022 (the graph's operations and the previous retune), FEAT-021 (the theme
tokens the portraits and the column colour are derived from).
