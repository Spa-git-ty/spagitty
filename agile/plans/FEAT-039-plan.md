<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-039 — Plan

**Item:** [`agile/items/FEAT-039-resizable-graph-column.md`](../items/FEAT-039-resizable-graph-column.md)
**Branch:** `feature/FEAT-039-resizable-graph-column`
**Status:** implemented, in `d3d5c21`.

*Backfilled by TASK-013 from the branch, the commit and the tests. The commit
message carries most of the reasoning, and it is quoted rather than paraphrased
where it is the record.*

## Approach

Delete a refusal that had outlived its reason, then make the geometry take a
span instead of assuming one.

### The refusal

```ts
// The graph's width is computed from the lanes on screen; a narrower one
// draws commits on top of each other, so it is not draggable.
if (column.computed) return;
```

True **before FEAT-035**, when `laneX` clamped the lane index and a narrower
column really did stack commits on one another. FEAT-035 made lanes share out
whatever space they are given, down to a floor — and left that compression
reachable only by *having more lanes*, never by asking for a narrower column.
The author's question was the fair one: then why did we build the collapsing?

### `computed` and `fills` stop meaning "cannot be sized"

They go back to meaning what they always described: what a column does when it
has **not** been given a width. The graph sizes itself to the lanes until
dragged; the message column fills until dragged; a double-click hands either
back. The graph's catalogue width becomes `0` — the same "size yourself"
convention the filling column already used — so a *stored* width is exactly what
says a person chose one.

That one change is why every divider now has a job, which is why the `fixed`
state and its styles are gone. BUG-009b's inverted divider was the workaround
for a column that could not be sized; when it can, the workaround is dead code.

### The geometry takes a span

`lanePitch`, `laneX` and `laneNodeRadius` take the span they must fit into
rather than assuming `LANE_SPAN`. `laneSpanFor(width, zoom)` is the inverse of
`laneColumnWidth`: what is left over for lanes inside a width somebody picked.

**The one that cost a wrong answer first**, quoted from the commit because it is
the kind of thing that is re-derived wrongly a second time:

> The count of lanes that land on a distinct x cannot be re-derived from the
> pitch: `floor(286 / 9.2258)` is 30, not 31, so the last lane fell a whole
> column short at exactly the widths where compression matters most. It is now
> stated as the two cases it actually is — above the floor every lane fits by
> construction, at the floor the span decides.

### The minimum drops to 48px

From 60px. With lanes compressing there is a useful column well below the old
floor, and the floor was set when narrowing meant stacking.

## Files

`src/lib/graph/columns.svelte.ts` — the refusal, the catalogue width, the
minimum.
`src/lib/graph/GraphHeader.svelte` — every divider sizes its own column; `fixed`
removed.
`src/lib/graph/CommitRows.svelte`, `LaneCanvas.svelte` — pass the chosen span.
`src/lib/graph/lanes.ts`, `src/lib/metrics.ts` — `laneSpanFor`, and the
span-taking geometry.
`src/lib/graph/columns.test.ts`, `src/lib/metrics.test.ts` — 19 assertions.

## Testing

Two halves, matching the change: the store's rules (`columns.test.ts`) and the
arithmetic (`metrics.test.ts`). The arithmetic is where the wrong answer was, so
the invariants are asserted as properties — every lane inside the column, at
every width and zoom — rather than as a handful of examples.

## Risk

Medium-high. The graph column is the screen's identity, and this makes it
draggable to 48px. The invariants that stop it becoming unreadable are the pitch
floor (unchanged, from FEAT-035) and `required`, which keeps the column from
being hidden entirely — a graph screen with no graph is a list.

The regression to watch is alignment: a commit's node and its lane must line up
at every width and zoom, which is BUG-003's territory and has its own assertions.

## Rollback

Revert the branch. The stored widths survive in settings and are harmless: a
stored graph width would simply be ignored again.
