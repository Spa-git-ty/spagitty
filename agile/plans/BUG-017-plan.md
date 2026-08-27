<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-017 — Plan

**Item:** [`agile/items/BUG-017-the-lens-wipes-the-window.md`](../items/BUG-017-the-lens-wipes-the-window.md)

## How the cause was found

Recorded because the route mattered: the first two hypotheses were wrong, and
both were wrong in ways that looked convincing from the screenshot alone.

The wiped fraction measured 1241/1693 across and 1016/1383 down — the same
ratio, 1.36, on both axes. That says a scale factor. `hyprctl monitors` reported
`scale: 1`, which appeared to rule the device pixel ratio out, and the next two
guesses — a stale region left by a resize, and WebKitGTK repaint damage from
adding and removing a filter — both fit the shape of the failure and neither was
testable by reading.

What settled it was putting the numbers on screen. A probe in the shell rendered
`devicePixelRatio`, the `.lens` box and the region attribute into a fixed
overlay, cycled a glass pane on and off, and the window was screenshotted
through the cycle. `devicePixelRatio` came back **1.3636** despite the
compositor's `scale: 1`: WebKitGTK derives its own ratio. The rest fell out at
once — CSS viewport 1247x1012 inside a 1701x1381 window, region attribute
1247x1013, paint stopping at device pixel 1013.

The lesson worth keeping: the compositor's scale is not the webview's ratio, and
`hyprctl` is not a substitute for asking the page.

## Approach

**Take the pixel unit out of the region.** A fraction of the element's own
bounding box cannot be read in the wrong pixels, and `.lens` was shaped
specifically so its border box is exactly the region wanted:

```
<filter x="0" y="0" width="1" height="1" filterUnits="objectBoundingBox">
```

**Take the subregions off the `feImage` primitives.** Absent, each defaults to
the filter region, and `preserveAspectRatio="none"` stretches the map onto it.
This is the part that keeps the fix from rotting: the fault was two sets of
numbers describing one geometry, and one of them being wrong. Now there is one.

**Then delete the compensation.** `svgDataUri` wrapped every map body in
`scale(devicePixelRatio)`, to correct for WebKit rasterising an `feImage` at the
size of a subregion that was itself in the wrong units. With the subregion gone
the compensation double-counts — it was visibly over-scaling the frost by 1.36
in testing — so `dpr` comes out of `svgDataUri`, `axisMap` and `shapeMask`
entirely, and out of `liquidGlass.ts` with it, including the
`matchMedia(resolution)` rebuild that existed only to keep it current. No part
of the module knows what a device pixel is any more.

## Alternatives considered

**Multiply the region by `devicePixelRatio`.** Two lines, and it would have
worked on this machine today. Rejected: it hard-codes a compensation for an
engine bug into the geometry, breaks on any engine that reads the unit
correctly, and leaves the two-sets-of-numbers arrangement that caused this in
place. It also would not have let the `dpr` machinery go.

**Keep the filter permanently on `.lens` rather than adding and removing it.**
This was the fallback if the cause had turned out to be repaint damage. Not
needed, and it costs a composited layer and a containing block for fixed
descendants for the whole session.

## Files

- `src/lib/ui/liquidGlassMaps.ts` — the region, the subregions, the removal of
  the ratio, `DEFAULTS.blur`, and the note recording why.
- `src/lib/ui/liquidGlass.ts` — the `dpr` plumbing and the resolution listener
  go; the `.lens` comment gains the finding.
- `src/lib/ui/liquidGlassMaps.test.ts`, `src/lib/ui/liquidGlass.test.ts`.

## Steps

1. Region to `objectBoundingBox`, `0 0 1 1`; drop the `feImage` subregions.
2. Drop `dpr` from the map functions and their caller; drop the resolution
   listener. `FilterSources` loses `width` and `height`, which nothing writes
   any more.
3. `DEFAULTS.blur` 13 to 28.
4. Tests: the region carries no pixel length, no `feImage` carries a subregion,
   the maps carry no scale transform, and a portaled pane leaves the stage on
   teardown.
5. Confirm at the wheel, at a ratio that is not 1.

## Risks

**`primitiveUnits` must stay at its default.** Setting it to
`objectBoundingBox` alongside `filterUnits` would reinterpret `stdDeviation` and
the displacement `scale` as fractions of the bounding box and destroy the
effect. Only `filterUnits` changes; the primitives keep user-space lengths.

**The maps are still authored at the measured size.** `axisMap` and `shapeMask`
keep `width` and `height` — the region is what turns those into device pixels
now. This is deliberate and is why the parameters did not all go.

**The ghosting is not independently proven fixed.** It was never reproduced on
its own before the fix, because it needed the region fault to produce it. The
evidence it is gone is sixteen clean cycles afterwards plus the stage holding no
stray node at any point. The sweep asks the author to confirm on the
repositories where they saw it.

## Rollback

Two source files and their tests. Reverting the commit restores the previous
region, the compensation and the old blur together — they are one change and
should not be separated, since the compensation is only correct against the old
region.
