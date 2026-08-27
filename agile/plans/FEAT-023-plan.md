<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-023 — Plan

## Architecture decisions

### The portrait is a value, not a drawing

`portrait(seed)` returns a description — a base colour and three blobs — and two
renderers consume it: a canvas one for the graph and a CSS one for the Author
column. The alternative, a function that draws, would have meant writing the
face twice, and two implementations of the same face drift the first time either
is touched. It also makes the interesting half testable without a canvas, which
is what the suite actually asserts.

### The seed is the email

A person commits as "Ada", "ada l" and "Ada Lovelace" over a career, and those
are one person. The address is what git keys them by, so it is what the face is
generated from, with the name as the fallback for commits that carry no email.
That is why `author_email` had to reach the frontend at all — the row did not
carry it.

### Generated, not fetched

Recorded in the item as the author's decision. The module header carries the
three reasons so the next person to ask finds the answer next to the code rather
than in a document.

### The cache lives with the generator

The graph repaints every visible node on every scroll frame. A portrait costs a
fill plus three radial gradients, so it is rendered once per author into an
offscreen tile and reused; the palette is part of the key, and `LaneCanvas`
drops the cache when the theme changes — beside the one other thing in the app
that resolves the palette, so the invalidation sits next to what it invalidates.

### The column's fill is derived, not declared

`--graph-bg` is `color-mix(--panel, --bg)` in one place rather than two literal
colours in each of eight palettes. Sixteen more values to keep in step, for a
shade nobody chooses deliberately, is how palettes drift apart.

### Each row paints its own slice of the column

A single element behind the scroller would have to be positioned against
`scrollTop` by hand and would lag it by a frame. The rows are already translated
for the scroll, so their cells are already in the right place.

## Files

| File | Change |
| --- | --- |
| `src/lib/graph/portrait.ts` | New. Description, both renderers, the tile cache. |
| `src/lib/graph/lanes.ts` | Heads, merge dots, `nodeRing`; ghost drawing removed. |
| `src/lib/graph/LaneCanvas.svelte` | Resolves `--graph-bg`, drops the portrait cache on a theme change. |
| `src/lib/graph/CommitRows.svelte` | Column surface, portrait in the Author cell, hover state removed. |
| `src/lib/graph/highlight.ts` | Reduced to `byAuthor`. |
| `src/lib/metrics.ts` | The geometry constants. |
| `src/app.css` | `--graph-bg`, `--graph-line`. |
| `crates/spagitty-core/src/graph.rs`, `src/lib/types.ts` | `author_email` on the row. |

## Steps

1. `portrait.ts` and its tests.
2. `author_email` through Rust, the wire type and the fixtures.
3. Metrics, then `lanes.ts`, then the two components.
4. Remove the hover effect; move the orphaned helpers to the trash bin.
5. Look at it — a harness that runs the real `drawLanes` against a made-up
   history in a headless browser, since the numbers cannot tell you whether a
   face reads as a face.
6. Records and docs.

## Risks

- **Scroll cost.** A face per node per frame is the thing to get wrong. The
  cache is the mitigation, and the tile is drawn at device resolution once.
- **Width.** Stated in the item; the author accepted it.
- **Portraits reading as mud.** Two saturated lane colours overlapping at full
  strength do. Fixed by the mid gradient stop and a 0.72 alpha per blob, chosen
  by looking at the rendered result rather than by argument.
- **Theme changes leaving stale faces.** The palette is in the cache key and the
  cache is dropped on `theme.id`.

## Rollback

Revert the commit. The Rust field and the wire type go with it; nothing outside
the graph reads either.
