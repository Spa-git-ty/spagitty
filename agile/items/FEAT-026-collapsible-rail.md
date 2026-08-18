<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-026 — The nav rail collapses to icons

**Status:** Done. Plan in `agile/plans/FEAT-026-plan.md`, tests in
`agile/testing/FEAT-026-automated.md` and `agile/testing/FEAT-026-sweep.md`.
**Screen:** the chrome, on every screen.

## Problem

The rail is 186px of permanent chrome. On a laptop, with the graph now wider for
its portraits, that is width the user cannot reclaim without dragging the rail
to its 140px minimum and still losing it.

## What was built

- A button at the top of the rail collapses it to a 48px strip of glyphs.
  Same items, same order, same routes — the muscle memory of which position is
  which screen survives. Every item keeps its name in `title` and `aria-label`.
- Expanding restores **the width the user had dragged**, not the default. That
  is the difference between a collapse and a reset.
- The state lives in `panels.svelte.ts` beside the widths, in the same
  `localStorage` entry, so it survives a restart the same way they do.
- `--rail-w` becomes the collapsed width while collapsed, so every component
  that already lays itself out against that variable follows without knowing
  anything new.
- The splitter is inert while collapsed, by pointer and by keyboard, and says
  why in its tooltip. Dragging a strip of icons wider would produce a rail that
  is neither collapsed nor expanded, and the width being dragged is the one held
  for the expansion.

## Acceptance criteria

1. A button at the top of the rail collapses and expands it. ✔
2. Collapsed, every screen is still reachable and still named to a screen
   reader and to a pointer. ✔
3. Expanding restores the dragged width. ✔
4. The state survives a restart. ✔
5. The splitter cannot resize a collapsed rail. ✔
6. A reset puts the rail back expanded at the design width. ✔

## Non-scope

- A keyboard shortcut for the collapse.
- Collapsing the detail panel, which has its own splitter and is not chrome.

## Dependencies

FEAT-021 (the panel widths and the tokens they publish).
