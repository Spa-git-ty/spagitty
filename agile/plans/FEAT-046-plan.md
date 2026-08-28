<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-046 — Plan

**Item:** [`agile/items/FEAT-046-graph-squeeze-keeps-the-portraits.md`](../items/FEAT-046-graph-squeeze-keeps-the-portraits.md)
**Branch:** `feature/FEAT-046-portraits-keep-size`
**Status:** implemented.

**Branch point.** Cut from `feature/FEAT-045-toolbar-location`, continuing the
unmerged stack rather than from `dev`. `dev` is a single scaffold commit and
carries none of FEAT-035 or FEAT-039, whose geometry this item changes. The
deviation from Amendment 13 is recorded here as it is in the rest of the stack.

## The distinction the geometry is missing

Compression has two causes and they are not the same thing:

- **The history is deep.** More lanes exist than `LANE_SPAN` can hold at the
  design pitch. Nobody asked for this; shrinking is what keeps the column
  readable, and it must keep happening.
- **The column was dragged narrower.** A person chose a width. They were
  choosing how much of the window the graph gets — not asking for smaller
  faces.

Today both arrive at the same place, because the node's radius is derived from
whatever span is in effect:

```
lanes.ts:154   laneNodeRadius(columns, span)      span = laneSpanFor(dragged width)
```

so every pixel dragged shrinks the portraits. The reference is unambiguous —
the avatar diameter is identical at the widest and the narrowest frame, and the
lanes fold behind the faces.

## The two changes

### 1. The radius comes from the depth, not from the drag

`laneNodeRadius(columns)` — against `LANE_SPAN`, the design span, rather than
against the dragged one. The lane *positions* still come from the dragged span,
so the lanes still fold into the column exactly as they do now; only the node
stops following them.

The consequences fall out of the arithmetic:

- **≤ 12 lanes:** `lanePitch(columns, LANE_SPAN)` is the design pitch, so the
  radius is `NODE_R` at every column width. This is the item.
- **> 12 lanes:** the design span cannot hold them either, so the pitch is
  already below the design value and the node still shrinks. Deep histories are
  unchanged.

This reverses FEAT-035's decision in the case the user caused. FEAT-035 argued
the node must come down with the pitch or the portraits redraw over the lane
compression that was just achieved — which is true, and is now accepted: the
folded lanes go *behind* the faces, which is what the reference does and what
the item asks for. Nothing leaves the column: `laneSpanFor` already reserves a
full `NODE_R` beyond the last lane when it works out the span, so a full-size
node on the deepest lane still lands inside the width it was given.

### 2. The five-lane floor goes back to being a width

`CommitRows.svelte` floors the lane count at `LANE_COLUMNS_MIN`, and `laneX`
floors it again inside the pitch calculation. At the design span neither floor
does anything — `lanePitch` caps at `LANE_PITCH`, so two lanes and five lanes
are laid out identically. Dragged narrow they do a great deal: a two-lane
repository is compressed as though five lanes had to fit, and the squeeze
starts long before any two lanes are touching.

Both floors come out of the geometry. The floor stays exactly where it belongs
— `laneColumns`, which is what `laneColumnWidth` uses, so the column is still
never narrower than five lanes' worth by default.

After this, compression starts at the width where lanes actually meet:
`(needed - 1) × LANE_PITCH`. A two-lane repository keeps the design pitch until
the column is narrower than one lane plus a node.

## Files

`src/lib/metrics.ts` — `laneX` stops flooring the count it passes to
`lanePitch`; the comment that explained the floor is rewritten to say where the
floor now lives.
`src/lib/graph/lanes.ts` — the node radius is taken against the design span.
`src/lib/graph/CommitRows.svelte` — `laneCount` is the true count; the
`LANE_COLUMNS_MIN` floor and the initial value that assumed it go.
`src/lib/metrics.test.ts`, `src/lib/graph/lanes.test.ts` — the assertions that
pinned the old behaviour become assertions of the new one.

## Testing

The invariant that matters is BUG-003's: nothing may leave the column. It is
asserted across widths and lane counts, now with a full-size node, and it holds
by construction because `laneSpanFor` reserves `NODE_R`.

Then the item's own claims: the radius is `NODE_R` at every dragged width for
an ordinary history; a history past the cap still shrinks; a two-lane
repository is not compressed at a width that holds two lanes; the lanes still
fold; node and lane still share an x.

## Risk

Medium, and confined to the graph. The change is four expressions, but it moves
a number every frame of the lane canvas depends on, and BUG-003 is the standing
proof that lane geometry is where this project's regressions live. The
mitigation is that the overflow invariant is already a test over a spread of
widths and counts, and it is tightened rather than relaxed here.

The visible trade: on a narrowly dragged column with several branches, faces
now overlap the folded lanes and each other. That is the reference's behaviour
and the item's explicit request, but it is a judgement, so the sweep asks for
it to be looked at directly.

## Rollback

Revert the branch. No schema, no persistence, no Rust change.
