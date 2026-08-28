<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-056 — The detail panel can be put away

**Status:** Done.
**Screens:** Graph (1A), Pull requests (1H).
**Raised by:** the author, using the application: "there's no button to hide the
right side panel — how did I forget that?"

## Problem

Every screen with a right-hand detail panel shipped that panel permanently. It
could be dragged narrower, down to its 200px minimum, and no further. On a
laptop that is a third of the window given to a commit message you have already
read, and the only way to reclaim it was to drag the divider shut and drag it
back — a resize, not a toggle, so the width you had chosen was gone.

The nav rail has collapsed to icons since FEAT-037. The panel on the other side
of the window had no equivalent, which reads as an oversight rather than a
decision, because it is one.

## Change

`panels.svelte.ts` gains a hidden set beside the widths: `isHidden(key)` and
`toggleHidden(key)`, persisted with the layout. A hidden panel publishes its CSS
variable as `0px` and keeps its stored width, so bringing it back gives you the
panel you dragged rather than the one the design ships — the same promise the
rail's collapse already makes.

The Graph and Pull requests screens each grow a toggle in their header, beside
the controls that were already there, and hide the panel's splitter along with
the panel: a divider with nothing on one side of it resizes nothing.

Only right-hand detail panels can be hidden. The rail collapses to icons
instead, because it is the only way between screens and a window with no way out
of the screen it is on is worse than one with a panel nobody wanted.
