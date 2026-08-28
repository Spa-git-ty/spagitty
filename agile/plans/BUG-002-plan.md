<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-002 — Plan

## Approach

One decision: **where the primary button's background is owned.**

`app.css` owns the glow — its tokens, its keyframes, its two-layer paint and its
reduced-motion fallback — because the effect is shared and belongs to the visual
system. `Btn.svelte` owns the ordinary button. The bug was the two owners
overlapping on one property, with scoping making the component win silently.

The fix draws the line: the component's `background` and `border` apply to
`.btn:not(.glow)`, so a glowing button has exactly one rule painting it. The
alternative — duplicating the glow's paint inside `Btn.svelte` at higher
specificity — would put the same gradient in two files and guarantee they drift.

## Files

| File | Change |
| --- | --- |
| `src/lib/ui/Btn.svelte` | `background` and `border` move to `.btn:not(.glow)`; the hover border becomes `.btn:not(.glow):hover:not(:disabled)`. |
| `src/lib/ui/btn.test.ts` | New. The regression test, reading the rules. |

## Steps

1. Split the `.btn` rule.
2. Confirm in the running app, not from the source: read the computed style over
   CDP before and after.
3. Regression test, records, docs.

## Risk

The one risk is a *different* button losing its border. Every non-glow button
still matches `.btn:not(.glow)`, and `.btn.primary:not(.glow)` still overrides
the colour, so the only visual change is on glowing buttons — which had no fill
at all a moment ago.

## Rollback

Revert the commit. The button returns to being invisible, which is the state
this fixes.
