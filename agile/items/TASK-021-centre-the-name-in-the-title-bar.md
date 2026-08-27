<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-021 — Centre the name in the title bar

**Status:** Done on `task/TASK-021-centre-the-name-in-the-title-bar`.
**Screen:** the chrome.
**Raised by:** the author: "put the Spagitty name of the app in the center of
the top title bar".

## Problem

The application's name sat at the left end of the title bar, with a flexible
spacer between it and the window controls. The author wanted it centred.

The interesting part is what "centred" has to mean. The bar holds the name and
three window controls, so centring the name in the space the controls leave over
lands it visibly left of the window's middle — by half the width of those
controls. The name has to be centred against the **window**, which means the
layout has to say where the middle is rather than letting the content decide.

## Change

The bar becomes a three-column grid — an empty column, the name, the controls —
with `minmax(0, 1fr)` on the outer two. Equal outer columns put the name in the
middle of the window whatever the controls are doing.

`minmax(0, 1fr)` rather than a bare `1fr`: with `1fr` the controls set a floor
for both sides, and the name is pushed off centre exactly when the window is
narrowest and there is least room to lose.

## Non-scope

- Absolute positioning, which was the obvious alternative and is worse here. See
  the plan.
- Anything else in the bar. The controls, the drag region and the double-click
  to maximise are untouched.

## Acceptance criteria

- The name is centred on the window, not on the space left over.
- It stays centred as the window is resized, including narrow.
- The bar still drags the window, including by the middle where the name is.
- The window controls stay hard against the right edge.
- The empty column says nothing to a screen reader.

## Dependencies

None.
