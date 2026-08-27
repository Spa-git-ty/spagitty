<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-020 — The glass material, settled at the window

**Status:** Done on `task/TASK-020-the-glass-material-settled`.
**Screens:** all — every menu, dialog, palette, toast and command log.
**Raised by:** the author, who asked for the glass knobs as sliders so the
numbers could be chosen by eye rather than argued about.

## Problem

The liquid glass shipped with numbers nobody had looked at against real content.
`DEFAULTS` carried the values the effect was written with, and a later change
raised the blur on request — but a request phrased as "more blur" is a direction,
not a value, and the only way to settle six interacting numbers is to look at
them.

## Change

A temporary panel of sliders on the Settings screen, wired straight to
`DEFAULTS` and to `--r-panel`, with a sample pane over text so the rim could be
judged against a real backdrop rather than a flat one. The author dragged them
and read back what they settled on:

```
depth 7   strength 6   chromaticAberration 0   blur 10   saturate 0
--r-panel 8px
```

Those are now the committed values. The sliders were scaffolding on a branch
that was never merged and went with it.

**The shape of the choice is worth recording**, because it is not what the
effect was built expecting: a third of the shoulder, less than half the push, no
colour split at the rim at all, and a frost that suggests rather than obscures.
`saturate: 0` drains the colour from the backdrop entirely, so the frost reads as
grey light rather than as a tint of the commit list underneath. Glass as a
material the interface is made of, rather than as an effect it performs.

`--r-panel` moved from 14px to 8px with them. At 14 a menu read as a rounded
card sitting on the application; at 8 it reads as a pane cut from it, which is
the corner a field already has.

## Scope

- The six values, committed where the application reads them.
- `RADII` in `metrics.ts`, which is a copy of the stylesheet's `--r-*`
  declarations that a test checks for agreement.

## Non-scope

- The sliders themselves. Scaffolding, never merged.
- The two thinner frost grades. They were not part of what was being tuned.

## Acceptance criteria

- The committed values are exactly the ones read back from the window.
- The stylesheet and the metrics copy of `--r-panel` agree.

## Dependencies

Tunes the material FEAT-057 introduced. Its consequences for cost are the
subject of a later task, which measured what these values were paying for.
