<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-021 — Plan

**Item:** [`agile/items/TASK-021-centre-the-name-in-the-title-bar.md`](../items/TASK-021-centre-the-name-in-the-title-bar.md)

## Approach

A three-column grid: empty, name, controls, with `minmax(0, 1fr)` outer columns
and the controls `justify-self: end`.

Equal outer columns are the whole mechanism. The grid decides where the middle
is and the content is placed into it, rather than the content deciding and the
middle falling wherever is left.

## Alternatives considered

**Absolute positioning** — `left: 50%; transform: translateX(-50%)` on the name,
over a relatively positioned bar. It is the reflexive answer and it drags three
problems behind it:

- the bar carries `data-tauri-drag-region`, and an absolutely placed child sits
  over it, so the name would have to opt out of the pointer to let the window
  still be dragged by its middle;
- a positioned element paints above a static sibling, so it would need a
  stacking index to stay under the window controls;
- it takes the name out of flow, so nothing stops it running under the controls
  on a narrow window.

None of those exist if the layout simply says where the middle is.

**Keeping the flex row and padding one side** by the width of the controls.
Works only while the controls never change size, which is not a property anyone
should have to maintain.

## Files

- `src/lib/chrome/TitleBar.svelte` — the markup and the grid.
- `src/lib/chrome/chrome.test.ts` — one test.

## Risks

**The leading column being announced.** It is a layout device with no content
and is `aria-hidden`, so a screen reader hears the name and the controls and not
a gap.

**Narrow windows.** `minmax(0, 1fr)` lets the outer columns shrink below their
content, and the name keeps its existing ellipsis. Checked in the sweep at a
window narrow enough to force it.

## Rollback

One file's markup and styles, and its test.
