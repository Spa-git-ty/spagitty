<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-017 — The lens wipes the right column and the bottom of the window

**Status:** Fixed, awaiting sweep
**Branch:** `bugfix/BUG-017-the-lens-wipes-the-window`
**Screens:** all — every menu and every dialog raises the lens.

## Problem

Opening a menu stops the application painting. The right-hand column and the
bottom band of the window go flat `--bg` and stay that way for as long as the
menu is open: the tab strip ends in mid-air, the status strip is not drawn, and
the screen under it is cut off. Closing the menu restores it.

The author reported three things together, and they are one fault:

1. the right column and the bottom of the window are wiped;
2. menus do not disappear — one is drawn over another;
3. the glass wants more blur.

The third is a preference and is settled by a number. The first two share a
cause.

**The filter region was written in one unit and read in another.** The liquid
glass built by FEAT-057 puts an SVG filter on `.lens`, and the filter's region
was declared with the element's measured width and height:

```
<filter x="0" y="0" width="1247" height="1013" filterUnits="userSpaceOnUse">
```

Those numbers come from `getBoundingClientRect`, so they are CSS pixels.
WebKitGTK consumes them as **device** pixels. On any display whose ratio is not
1 the region therefore covers `1 / devicePixelRatio` of the element, and
everything outside the region is never painted — leaving `.app`'s own
background showing through, which is the flat slab in the report.

The second symptom follows from the first. The DOM was never at fault: across
sixteen open-and-close cycles the portal stage held exactly one node while a
menu was open and none afterwards. What the author saw was stale pixels — a menu
drawn into a composited layer that was the wrong size, left behind because the
area it occupied was outside the region the layer ever repainted.

## Reproduction

1. Run Spagitty on a display whose `devicePixelRatio` is not 1. It need not be a
   HiDPI panel — WebKitGTK derives its own ratio, and reported 1.3636 on a
   monitor Hyprland lists at `scale: 1`.
2. Open any menu — the branch dropdown in the toolbar will do.
3. Look at the right-hand edge and the bottom of the window.

**Observed:** the application stops painting at `width` and `height` device
pixels from the top-left, where those are the numbers `.lens` measures in CSS
pixels. Everything beyond is flat `--bg`.
**Expected:** the window paints to its edges, with the menu over it.

**Measured at the wheel.** On a 1701x1381 window at a ratio of 1.3636, `.lens`
measured 1247x1013 CSS pixels, the region attribute read 1247x1013, and the
paint stopped at device pixel y=1013 — not at 1381, and not at the 743 a
correctly scaled region would have given. The author's own screenshot shows the
same arithmetic on a 1693x1383 window: boundaries at 1241 and 1016, against a
CSS viewport of 1241x1014.

**Environment:** Linux, Wayland, Hyprland, WebKitGTK through Tauri v2, monitor
scale 1, `devicePixelRatio` 1.3636.

## Scope

- The filter region stops depending on any pixel measurement.
- The `feImage` primitives stop carrying subregions of their own, so one set of
  numbers decides the geometry instead of two that can disagree.
- The device-ratio compensation inside the maps goes, along with the rebuild
  that existed only to keep it current — the thing it compensated for is gone.
- `DEFAULTS.blur` rises from 13 to 28.

## Non-scope

- The `backdrop-filter: url(#filter)` route. WebKitGTK still renders nothing for
  it; that is why the filter is on the other side of the glass, and this item
  does not revisit it.
- Making the effect cheaper. The filter is rebuilt and torn down exactly as
  before.

## Acceptance criteria

- With a menu open, the window paints to its edges at any device pixel ratio.
- The frost lands on the pane's own footprint, not a scaled copy of it.
- Closing a menu leaves nothing drawn where it was, and a second menu does not
  appear over the first.
- No pixel length appears in the filter region, and no `feImage` carries a
  subregion — both covered by tests, so the fault cannot return quietly.

## Dependencies

Fixes a defect in FEAT-057, which introduced the lens.
