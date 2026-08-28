<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-002 — The primary button has no fill, so its label is invisible

**Status:** Fixed. Plan in `agile/plans/BUG-002-plan.md`, tests in
`agile/testing/BUG-002-automated.md` and `agile/testing/BUG-002-sweep.md`.
**Screen:** every screen with a primary button; most visibly the toolbar's
Commit (1A) and the Clone modal (1L).

## Observed

The toolbar's Commit button renders as white text on the page background — the
label reads as missing rather than as a button. Computed style in the running
app:

```
class                btn s-_mZ7GpzJzN9V primary glow
background-color     rgba(0, 0, 0, 0)
background-image     none
color                rgb(255, 255, 255)
border-color         rgba(76, 79, 105, 0.26)
```

## Expected

The accent fill from `.glow` in `src/app.css`, with `--on-accent` text on it and
the travelling ring in the border — the effect FEAT-021 designed and documented.

## Reproduction

At commit `02019c9`, on any theme, with no repository open:

```sh
rm -rf node_modules/.vite && npm run dev
```

Look at the Commit button on the right of the toolbar. It is a label with no
button under it. Worse on the light palettes, where white on `#eff1f5` is nearly
gone; on a dark palette the same text stays readable by accident, which is why
this survived.

## Environment

Any. It is a CSS specificity result, not environment-dependent, and it is
identical in the Tauri webview and in Chrome.

## Cause

Specificity, not colour. Both tokens were right the whole time.

- `.glow` (`src/app.css:223`) paints the fill: an accent `linear-gradient`
  through `padding-box` and the conic ring through `border-box`. Specificity
  (0,1,0).
- `.btn` (`src/lib/ui/Btn.svelte`) set `background: transparent`. Svelte scopes
  every component selector, so it is really `.btn.s-hash` — specificity (0,2,0),
  which wins.

So the fill was overwritten by the component's own reset, `.btn.primary:not(.glow)`
deliberately excluded the glow from the fallback accent fill, and nothing was
left to paint the button. The 1.5px `--line` border did the same thing to the
ring, and the hover rule painted `--accent` over it as well.

## Fix

The background and the border move to `.btn:not(.glow)`, and the hover border to
`.btn:not(.glow):hover`. The glow keeps one owner — `app.css` — for both layers
it paints. No token, no colour and no markup changed.

## Why it was not caught

Nothing asserted it. The suite mounts components without applying CSS, so a
`getComputedStyle` assertion in a test would have passed regardless; the visual
gates that would have caught it are the manual sweep, and Amendment 4 kept
verification headless. The regression test added with the fix therefore reads
the stylesheets and asserts the *rule* rather than the paint — see
`agile/testing/BUG-002-automated.md`.

## Dependencies

FEAT-021 (the visual system and the glow).
