<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-042 — Tighter corners, and a cast shadow that follows them

**Status:** Done on `feature/FEAT-042-softer-corners`.
**Screen:** every one — the radii are tokens, and the shadow is the window's.
**Requested by:** the author, 2026-08-18: less rounded corners, and round the
cast shadow.

## Problem

**The corners are too round.** The scale was set at 6 / 8 / 12 / 14 px —
field, panel, window, button — with the reasoning that it should be "gentle at
the small end and generous at the large" so a 6px field and a 999px chip read as
one system. The generous end reads as soft rather than precise for an
application whose whole subject is a graph of straight lines.

**The cast shadow's corners are tighter than the window's.** The window is:

```css
border-radius: var(--r-window);          /* 12px */
box-shadow:
    inset 0 1px 0 var(--window-sheen),
    0 1px 2px var(--window-contact),
    0 12px 32px -4px var(--window-cast);
```

A negative spread shrinks the shadow's box by 4px on every side, **and shrinks
its corner radius by the same 4px**. So the soft shadow under the window is
drawn with an 8px corner where the window has 12px, and the cast reads as a
squarer shape sitting under a rounder one — which is the "round the cast shadow"
half of the request.

## Scope

- Tighten every radius token proportionally, keeping the relationships that
  make the scale a scale: controls rounder than surfaces, the window rounder
  than a panel, the pill untouched.

  | Token | Was | Now |
  | --- | --- | --- |
  | `--r-field`, `--r-row` | 6px | 4px |
  | `--r-panel` | 8px | 6px |
  | `--r-button` | 14px | 10px |
  | `--r-window` | 12px | 10px |
  | `--r-pill` | 999px | 999px |

- **Both copies.** `metrics.ts`'s `RADII` publishes the scaled values at
  runtime and is what the interface actually gets; `app.css` is what the first
  paint uses before any JavaScript runs. They have to agree, and until now
  nothing checked that they did.
- Remove the cast shadow's negative spread so its corner radius is the window's,
  and re-balance the offset, blur and alpha so the weight of the shadow is
  unchanged — only its shape.

## Non-scope

- `--r-pill`. A radius past half the box is clamped by the browser; changing it
  changes no pixel.
- The menu's own shadow, and every other local `box-shadow`. This item is the
  window's cast and the shared radii.
- The window's depth as a whole — the sheen and the contact shadow are FEAT-037's
  and are unchanged.

## Acceptance criteria

- Every corner in the app is visibly tighter, and the relationships between
  field, panel, window and button are preserved.
- The cast shadow's corners match the window's at every corner.
- The shadow's weight is unchanged: no more or less "lift" than before.
- `app.css` and `metrics.ts` agree, and a test fails if they stop agreeing.
- Zoom still scales the radii, and `--r-pill` still does not.
- A maximized window is still square, with no cast.

## Dependencies

FEAT-037, which built the window's depth and set the radii being tightened.
