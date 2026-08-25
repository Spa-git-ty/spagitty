<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-053 — Lanes turn square

**Status:** Done. Plan: [`agile/plans/FEAT-053-plan.md`](../plans/FEAT-053-plan.md).
**Screen:** Graph (1A), Stash (1G).
**Raised by:** the author, comparing against a commercial client: *"they seem to
take it like a smoothed 90 degree"*.

## Problem

A lane that changes column was drawn as a cubic bezier spanning the whole row —
a long S that left one lane vertically, swept across, and arrived at the other
vertically.

That reads well with a handful of lanes and badly with many. Every transition
becomes a diagonal sweep; a dozen of them in one band overlap into a fan, and
there is no straight run left anywhere for the eye to follow. FEAT-052 widened
the lanes so they could be told apart, and this is the other half of the same
complaint: telling two lanes apart is no use if neither of them holds still.

The reference turns **square** — down its own lane, a tight corner, straight
across, a tight corner, down the new one — and keeps the runs straight.

## Scope

- A rounded right angle instead of a cubic, in the graph.
- The same shape in the Stash screen, which draws its own elbow.

## Non-scope

- **Where the turn happens.** It is at the middle of the band, which is what the
  reference does and what the old curve's midpoint effectively did. Turning at
  the top or the bottom of the row is a different picture and was not asked for.

## Dependencies

FEAT-052, which widened the lanes this makes legible.
