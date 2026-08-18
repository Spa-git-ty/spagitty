<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-043 — A status strip along the bottom of the window

**Status:** Done on `feature/FEAT-043-status-strip`.
**Screen:** the shell, so every screen.
**Requested by:** the author, 2026-08-18: move `GPL-3.0 · v0.1.0` out of the
title bar and into a status strip at the bottom right of the window.

## Problem

The build's identity — `GPL-3.0 · v0.1.0` — sits in the **title bar**, between
the repository tabs and the window controls. Two things are wrong with that
position:

1. **It competes for the row that names what is open.** The title bar's job is
   the repository, the branch and the tabs. A licence and a version number are
   the least changing facts in the application and they are sitting in its most
   contested row — a row that also has to give way to tabs as more repositories
   are opened.
2. **The window has no bottom edge of its own.** Every screen draws its own
   footer or none, so the shell has nowhere to put anything that is true
   regardless of which screen is open. That is why the build identity ended up
   at the top: there was no bottom.

## Wanted

A strip along the bottom of `.app`, below the screen, above the window's own
rounded corner. The build identity sits at its right end. The left end is
deliberately empty for now.

## Scope

- `StatusStrip.svelte` in `src/lib/chrome/`, rendered as the last child of
  `.app` in the layout — so it spans the whole window, under the rail as well as
  the screen.
- The build identity moves there, with the same `title` carrying the full SPDX
  identifier.
- The title bar loses the note and keeps the spacer, so the tabs and controls
  keep their positions.
- The strip is one line high, quiet: secondary type, muted colour, a hairline
  above it, and the window's bottom radius clipped from it.

## Non-scope

- **Anything else in the strip.** No counts, no repository path, no branch, no
  progress. The strip exists because there was nowhere to put a window-wide
  fact; filling it with a second copy of things the rail and toolbar already say
  is how a status bar becomes noise. The left end stays empty until something
  genuinely belongs there.
- The screens' own footers. The graph's footer is not this strip and is not
  touched here.
- Settings → About, which shows the licence and the exact commit in full and
  remains the complete answer.

## Acceptance criteria

- `GPL-3.0 · v0.1.0` appears once in the application, at the bottom right.
- The title bar no longer shows it, and its tabs and controls are unmoved.
- The strip is present on every screen, including with no repository open.
- It does not scroll with the screen, and never covers content.
- The window's bottom corners stay rounded, with the strip clipped to them.
- Hovering the identity still gives the full SPDX licence identifier.

## Dependencies

FEAT-021, which put the identity in the title bar and took the theme control
out of it. FEAT-037, which owns the window's radius and depth.
