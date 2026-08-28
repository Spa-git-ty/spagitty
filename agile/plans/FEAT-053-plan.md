<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-053 — Plan

**Item:** [`agile/items/FEAT-053-square-lane-turns.md`](../items/FEAT-053-square-lane-turns.md)
**Branch:** `feature/FEAT-019-commit-signing`
**Status:** implemented, and **checked by eye**.

## Approach

`ELBOW_C1` and `ELBOW_C2` — the two cubic control points — are gone, replaced by
one number: `ELBOW_RADIUS`, the radius of the two quarter-turns.

The path is now `moveTo` → `arcTo` → `arcTo` → `lineTo`: down the old lane to
the middle of the band, a quarter turn, straight across, a quarter turn, down
into the new lane. `arcTo` rounds the corner between the line into a point and
the line out of it, which is exactly a quarter turn here, so the shape falls out
of two calls rather than being constructed.

**6px.** Small enough to read as a corner rather than a curve, large enough not
to look like a mitre joint at the stroke width the lanes are drawn at. It scales
with the pitch, so a squeezed row turns proportionally tighter, and it is
clamped against half the crossing and half the row — otherwise a jump between
neighbouring lanes at a compressed pitch would round past its own corner and
bulge.

The Stash screen draws its own elbow in SVG for the two-row lane it shows, and
it now draws the same shape with two `A` arcs. A stash is drawn like a branch
because it *is* one, and the two pictures disagreeing would undo that.

## How it was checked

Run, on the author's desktop, against a repository built for it: five topic
branches merged into `main` in two rounds, so the top of history is nothing but
crossings. Screenshotted with `grim` and read at 3×.

The corners are square with a visible radius and the runs between them are
straight. That is the whole claim, and it is now one somebody has looked at
rather than one the tests imply.

Worth recording how the check was *nearly* useless: the first run pointed at
this repository, whose current branch is a linear stack — every commit on lane
0, not a single transition on screen. A visual check against a history with no
crossings would have proved nothing while looking like proof.

## What was not done

- **Turning at the row boundary rather than the band's middle.** A different
  picture, and not the one that was asked for.
- **Xvfb.** Not installed, and the author chose to run it on the real desktop
  instead. `docs/testing.md` still prescribes Xvfb as the tidier route.
