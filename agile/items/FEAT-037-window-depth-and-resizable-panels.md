<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-037 — The window has depth, and every panel resizes

**Status:** done on `feature/FEAT-037-window-depth`.
**Requested by:** the author, testing the build. Two requests, one item, because
both are about the same thing: surfaces that were declared and then never
finished.

## Problem

**1. The application reads as flat.** It is an undecorated, opaque rectangle. It
has no corner of its own, no edge, and casts no shadow — nothing separates it
from whatever is behind it.

**2. Only two panels resize.** The rail and the graph's detail panel have
splitters. Stash, Working copy, Diff and Pull requests each *publish a width as
a CSS custom property* — `--detail-w`, `--changes-files-w`, `--diff-files-w`,
`--requests-detail-w` — and then give nobody a way to change it. A width that is
a variable but not adjustable is an oversight, not a decision.

## Scope

**The window as a card.**

- `transparent: true` in `tauri.conf.json`, and a `--window-gap` margin on the
  body for the shadow to fall into. A `box-shadow` on an element flush against
  the window edge is clipped away entirely, so the margin is not decoration.
- `--r-window: 12px`, deliberately larger than `--r-panel: 8px`. A window's
  corner is read against the whole screen rather than against the surface beside
  it, and the radius that reads as soft on a chip reads as square on a window.
- A **0.2px outline** at `outline-offset: -0.2px`, as asked. Sub-pixel so it
  lands as a real edge on HiDPI and a faint one at 1x. Heavier and it reads as a
  border, which belongs to a component rather than to a window.
- An **inset top highlight**, which was not asked for and is what stops the
  outline reading as a drawn line rather than a lit edge.
- **Two shadows, not one**: a tight dark contact shadow holding the card down,
  and a wide soft one giving it height. One mid-sized blur produces the look of
  a sticker on a page.
- Maximized drops all of it — a floating card with a gap around it is a window
  that does not fit its own screen. `appWindow.watchMaximized()` publishes the
  state as `data-window` on the root, because CSS cannot ask Tauri.

**Every panel resizable.**

- `PANELS` in `panels.svelte.ts` becomes a registry: each panel declares its CSS
  variable, which edge it is anchored to, and its default, minimum and maximum.
- `Splitter` takes any panel key, and measures **the panel next to it** rather
  than the window. The window's edge is the right reference only for the rail;
  for anything nested inside a screen the rail's own width sits in between.
- Splitters added to Stash, Working copy, Diff and Pull requests.

## Risk, stated plainly

`transparent: true` is the highest-risk change in this item. BUG-004 was a
WebKitGTK rendering defect on Linux that left the window blank for a whole
session, and transparency is the same territory. The author also hit an
unrelated input problem on Wayland earlier the same day.

If the window renders blank or stops taking input, `transparent` goes back to
`false` and the shadow with it; the rounded corner and outline survive on their
own, minus the corner being drawn over an opaque square.

## Non-scope

- Conflicts, Log and Rebase, whose panes are `flex: 1` rather than fixed widths.
  Making those resizable means giving them a width to resize, which is a layout
  change rather than adding a handle.
- Any change to what the panels contain.

## Acceptance criteria

- The window has a soft corner, a hairline edge, and casts a shadow.
- Maximizing squares the corner and drops the shadow; restoring brings both back.
- Stash, Working copy, Diff and Pull requests each have a working splitter.
- Every panel clamps to its own range and survives a restart.
- A layout stored before a panel existed still loads, and that panel takes its
  default.

## Dependencies

None. BUG-009b is adjacent — both are about handles people cannot find — but
neither depends on the other.
