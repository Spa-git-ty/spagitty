<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-057 — Liquid glass: the pane that bends what is behind it

**Status:** Done on `feature/FEAT-057-liquid-glass`.
**Screens:** all — the chrome, every menu, every dialog.
**Raised by:** the author, asked whether the glass is meant to be the thing
people notice about Spagitty: "yes liquid glass shall be the eye catching part
of this software".

## Problem

The chrome has been frosted since the glass landed, and frost on its own reads
as a translucent rectangle. Real thick glass does not merely blur what is behind
it — it *bends* it: the backdrop is pushed outward toward the rim, hardest in
the band where the shoulder curves away, and the colour splits a little where
the bend is sharpest. Without that, a pane is a tinted box no matter how well it
is tinted.

There was a second problem underneath the first, and it is the reason this item
has an identifier at all. The refraction module was written, 400 lines of it,
and **wired to nothing**: `use:liquidGlass` appeared nowhere in the tree, and
`src/app.css` named it only in a comment. It was also uncommitted, and the
commit before it — `356142f`, "Make the glass thicker and slower" — carried no
work item, which is the first commit in this repository's history that does not.
Both are recorded here rather than tidied away.

## The obstacle, and what it forced

`backdrop-filter: url(#filter)` is how every published web recreation of this
effect works: an SVG displacement map applied to the pane's own backdrop.

**WebKitGTK renders nothing for it.** The declaration parses, `CSS.supports`
answers yes, `getComputedStyle` hands the value back, and the pane comes out
pixel for pixel identical to one with no filter at all. WebKit restricts
`backdrop-filter` to the built-in filter functions deliberately, to keep it on
the GPU; there is a W3C issue open asking for an interoperable way to do this
(w3c/svgwg#1142). A capability probe that only checks whether the value parses
comes back true and is wrong.

So the filter goes on the other side of the glass. `filter: url(#filter)` — the
ordinary one — is fully supported, `feImage` and `feDisplacementMap` included.
Rather than displacing the pane's backdrop, Spagitty displaces the *application*,
in a ring the exact shape of the pane's rim. The pane then sits on top carrying
only its tint and its edge, and what bends around it is the actual commit list,
actually displaced.

## Change

- `src/lib/ui/liquidGlassMaps.ts` — the arithmetic, pure: the two axis
  displacement maps, the alpha mask, the shoulder clamp, the material choice and
  the filter itself. No document, so it can be read and tested without a window.
- `src/lib/ui/liquidGlass.ts` — the Svelte action: measures the panes, keeps one
  registry for the window, and rebuilds when a pane moves, resizes, or the
  display changes scale.
- `src/routes/+layout.svelte` — a `.lens` wrapper inside `.app`. The filter goes
  on `.lens` because `.app` carries the window's outline and cast shadow, both
  drawn outside its border box, and a filter clips to that box: filtering `.app`
  would cut the window's own edge off for as long as a menu was open.
- `src/lib/ui/Menu.svelte` and `src/lib/ui/DialogHost.svelte` — the two panes
  that float, and the two the module was written for.
- The tuning that came with it: the sheen off every pane, `--glass-rim` for
  chrome and `--glass-rim-thick` for the panes that float.

## Acceptance criteria

- A menu and a dialog refract the application behind them, and the ring follows
  the pane's own corner radius.
- The window's outline and cast shadow are not clipped while a pane is open.
- One filter for the window, not one per pane, with two panes open at once.
- The filter is removed when the last pane closes — a filtered element is a
  composited layer and a containing block for its fixed descendants, and neither
  is worth paying for over an empty screen.
- Nothing happens at all when there is no `.lens`, which is every component test
  and every story.
- The maps land on a scaled display: the ring is on the pane, not up and to the
  left of it.

## Non-scope

- The command palette and the clone modal are panes of the same glass and are
  not wired here. They are one `use:` directive each once this is proven on the
  two that carry the most traffic.
- Any accelerated path. FEAT-055 measured this window as rasterizing on the CPU,
  which is exactly why the effect is one filter over the window rather than
  fifty-four blurred layers.

## Dependencies

FEAT-055, whose measurement decides how much this may cost. FEAT-037 and
FEAT-042, which drew the window this sits inside.
