<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-024 — The glass reads as glass again

**Status:** Done.
**Screens:** all — every menu, dialog, palette, toast and command log.
**Raised by:** the author: "fix liquidglass menu bar still look just
transparent ! and the otherway of doing it was lowiring the fps dramateclty".

## Problem

A floating pane reads as a plain translucent rectangle rather than as a pane of
glass. The author has now said so twice, and the second half of their sentence
names the constraint: the version that *did* look like glass was the SVG lens,
and it cost 180ms of every frame (TASK-022). Any fix that reaches for the lens
again is not a fix.

Three things had made the material flat, and they arrived separately:

1. **`saturate(0)`.** TASK-020 settled it by eye when the lens was still
   underneath, where displacement did the work of saying *material* and the
   frost only had to be quiet. TASK-022 kept the number and removed the lens.
   With nothing bending the backdrop, draining its colour leaves grey — and
   grey behind a tint is what "just transparent" looks like.
2. **A tint at 82%.** Four fifths of the backdrop covered leaves the frost
   almost nothing to be made of. What little survives is the grey from (1).
3. **No edge at all.** `--glass-rim`, `--glass-rim-thick` and `--glass-sheen`
   were a box-shadow, a box-shadow and a gradient, and TASK-023 switched all
   three off when the author asked for a flat interface with no shadows. That
   was right for shadows and wrong for the pane, which lost the one thing that
   says it has thickness. Nothing replaced them.

## Change

The material, in the four tokens every floating pane already reads:

- `--blur-thick` — `saturate(0)` becomes `saturate(170%)`. **The 10px radius is
  unchanged**, deliberately: it is the one number in this material that has
  been measured on this renderer, at 16.0ms a frame against the lens's 196ms.
  Saturation is a per-pixel matrix rather than a kernel and costs effectively
  nothing at any value, so the material is bought with the free half.
- `--glass-thick` — 82% to 68% on light, 86% to 72% on dark.
- `--glass-edge-line` — new: `1px solid var(--glass-edge-low)`. The edge comes
  back as a **border**, which is what TASK-023 kept, rather than as the rim
  shadow it removed. The top side takes `--glass-edge` so the pane is lit from
  above and has a near face and a far one.
- The five panes that float — `Menu`, `DialogHost`, `Palette`, `NoticeToast`,
  `CommandLog` — each take that border. The toast declares it before its own
  accent stripe, so the stripe still wins on the left.

## The stray brace

`src/app.css` has been one closing brace over-balanced since FEAT-056, at what
is now line 440. Browsers recover from a stray `}` at the top level by
discarding it, which is why nothing has ever shown a symptom and why nothing
caught it. It is fixed here, in the file this task is already editing, and
`glass.test.ts` now fails if the stylesheet stops balancing.

## What this deliberately does not do

**The chrome bars are not blurred.** The approved plan for this task was to
overlay the top bars and let the screens scroll beneath them, so the bars would
have real content to frost. Working through the geometry showed it does not
deliver that:

- Every screen opens with its own header bar. Overlaying the top chrome by its
  own height puts that header behind it, not the screen's content — one flat
  veiled bar behind another. Nothing is frosted that was not flat already.
- For rows to pass behind the top chrome, each screen's own header would have
  to float over its scroller too, and the graph's scroller is virtualised.
  Giving a virtualised scroller a top offset is how BUG-003 happened, and this
  task cannot be verified at the window (see below), so it is not the change to
  make blind.
- Blurring five permanently visible bars is what `src/app.css` already warns
  against by name, and it would buy nothing while the backdrop behind them is
  flat `--bg`.

**Question to the author —** the bars can still become glass, by making one
screen's content scroll under the chrome; it is a layout change to that screen
rather than a token change, and it wants the wheel. Worth a separate item?

## Acceptance criteria

- No pane declares `saturate(0)`, and the thick blur's saturation is above 100%.
- The thick blur's radius is still exactly 10px.
- `--glass-thick` leaves more than 20% of the backdrop visible, in both themes.
- Every component that paints itself with `--blur-thick` carries an edge drawn
  with `--glass-edge`.
- The rim and sheen tokens stay `none` in both themes: the edge is a border,
  and TASK-023's flat interface is not quietly undone.
- `src/app.css` is brace-balanced.

## Dependencies

Corrects the material TASK-020 settled and TASK-022 carried over; restores, as
a border, the thickness TASK-023 removed as a shadow. Takes TASK-022's
measurement as the budget it may not exceed.
