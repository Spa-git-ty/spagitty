<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-042 — Plan

**Item:** [`agile/items/FEAT-042-tighter-corners-and-a-round-cast.md`](../items/FEAT-042-tighter-corners-and-a-round-cast.md)
**Branch:** `feature/FEAT-042-softer-corners`
**Status:** implemented.

## Approach

Move the scale, not the relationships. Then take the shrink off the shadow.

### The radii

The old scale was 6 / 8 / 12 / 14 and its comment argued for its shape rather
than its numbers: gentle at the small end, generous at the large, so that a
field and a pill read as one system. That argument survives a tighter scale
intact, so every step comes down and the order is kept:

| Token | Was | Now | Why that one |
| --- | --- | --- | --- |
| `--r-field`, `--r-row` | 6px | 4px | the smallest step; 3px starts to read as square at this size |
| `--r-panel` | 8px | 6px | a surface stays tighter than a control |
| `--r-button` | 14px | 10px | still the roundest thing that is not a pill |
| `--r-window` | 12px | 10px | still ≥ a panel's, read against the whole screen |
| `--r-pill` | 999px | unchanged | clamped by the browser at half the box |

**Both copies move.** `metrics.ts`'s `RADII` is published to CSS at runtime with
zoom applied, and is what the interface actually renders with; `app.css` is what
the first paint uses before any JavaScript runs. Changing one and not the other
shows up as corners that visibly jump on load, and nothing checked they agreed —
so this item adds the check, reading the stylesheet the way `scale.test.ts`
already reads it for the type scale.

### The cast shadow

```css
0 12px 32px -4px var(--window-cast)   /* was */
0 10px 28px var(--window-cast)        /* now */
```

A box-shadow's corner radius is the box's radius **plus its spread**. A `-4px`
spread therefore drew the cast with an 8px corner beneath a 12px window: a
squarer shape under a rounder one, which is what the author saw. Removing the
spread makes the cast follow the window exactly.

Without the shrink the shadow also covers 4px more on every side, so it would
land heavier than before if nothing else moved. The offset and blur come down
with it (12→10, 32→28) and `--window-cast` loses a little alpha in both themes
(light 0.30→0.26, dark 0.55→0.48). The intent is that the *shape* changes and the
weight does not — which only a person can confirm, so the sweep does it side by
side.

### Why not keep the spread and raise the radius

Compensating by drawing the shadow with a larger radius is not possible: a
shadow has no radius of its own. The only ways to round the cast are to remove
the negative spread or to round the window further, and the request was for
*less* rounding.

## Files

`src/app.css` — five radius tokens, two shadow alphas, and the comments that
named the old numbers.
`src/lib/metrics.ts` — `RADII`, and a note saying it duplicates the stylesheet.
`src/routes/+layout.svelte` — the cast, with the spread explained where it was.
`src/lib/metrics.test.ts` — the agreement test.

## Testing

The agreement test is the one that matters, and it was proved by making the two
files disagree and watching it go red before it was kept. Everything else here
is a number in a stylesheet: `btn.test.ts` and the theme composites already read
CSS for the rules that matter, and none of them pins a radius value, which is
correct — a test asserting `4px` would fail on the next taste decision without
protecting anything.

## Risk

Low, and entirely visual. Every radius is a token, so nothing hard-codes a
corner that would now disagree — with one exception worth naming: local
`box-shadow` rules elsewhere (the menu's, for one) are untouched, and if any of
them carries a negative spread it has the same defect. None does today.

The judgement call is the shadow's weight. It is deliberately tuned by eye, and
the sweep is where it is confirmed.

## Rollback

Revert the branch. Nothing persists.
