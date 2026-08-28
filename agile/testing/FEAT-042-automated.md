<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-042 — Automated tests

**Item:** [`agile/items/FEAT-042-tighter-corners-and-a-round-cast.md`](../items/FEAT-042-tighter-corners-and-a-round-cast.md)
**File:** `src/lib/metrics.test.ts`.

## Test

| Test | Holds in place |
| --- | --- |
| `agrees with the radii declared in the stylesheet` | `RADII` and `app.css` publish the same four radii, so the corners the first paint draws are the corners the app keeps |

It reads `src/app.css` and compares each declaration against what `applyMetrics`
publishes at zoom 1. It was verified by disagreement: changing `r-panel` to `7`
turns it red, and only then was it kept. A regex-driven assertion that cannot
fail is worse than none, and this is how BUG-005's kind of drift gets caught in
a different file.

## What is deliberately not asserted

**The values themselves.** No test says a field is 4px. A radius is a taste
decision, and a test pinning it would fail on the next one while protecting
nothing — what needs protecting is that the two copies agree, and that zoom
still scales them.

**The shadow.** Its shape is a CSS rule with no arithmetic behind it, and the
environment applies no stylesheet, so an assertion here would only re-state the
source. The claim being made — same weight, rounder corners — is a judgement,
and it belongs in the sweep.

## Still passing, unchanged

`publishes every structural metric as a px custom property`, including that every
published value carries a unit — a bare number is ignored by CSS and would
silently collapse a radius to zero.

## Coverage

1311 tests across 56 files, all passing.

## Not covered here

Everything visual: `FEAT-042-T1` through `T4` in the sweep.
