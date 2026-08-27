<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-022 — The glass goes back on the GPU

**Status:** Done on `task/TASK-022-the-glass-goes-back-on-the-gpu`.
**Screens:** all — every menu and every dialog.
**Raised by:** the author, using the application: "the app is so slow now
specially applying glass effect, make sure that this is optimized and gpu
accelerated".

## Problem

One pane of glass took the window from 60 frames a second to five.

Measured, rather than reasoned about, on a 1701x1381 window with one pane
registered and a continuous repaint running so the compositor was actually
working. Median frame interval, with the 90th percentile beside it:

| variant | median | p90 | effective |
| --- | --- | --- | --- |
| no pane at all | 16.0ms | 16–17ms | 60fps |
| the lens as shipped, 16 filter primitives | 196.0ms | 398.0ms | 5fps |
| the lens with the identical displacement passes collapsed, 9 primitives | 102.0ms | 205.0ms | 10fps |
| `backdrop-filter: blur(10px) saturate(0)` | 16.0ms | 16.0ms | 60fps |

`build()` — the JavaScript that assembles the maps and installs the filter —
measured 0.00ms median and 1.00ms at worst throughout. **None of the cost was
the code.** Caching the maps, coalescing the rebuilds and trimming the
allocations would together have bought nothing measurable, and all three were on
the list before the numbers came in.

The cost is the filter itself rasterising. Every primitive covers the whole
window and runs on the CPU, and there were sixteen of them, including a
full-window Gaussian blur whose result is then thrown away everywhere outside a
280x220 pane.

**This was a known trade, not an accident.** `src/app.css` records it: WebKit
restricts `backdrop-filter` to the built-in filter functions deliberately, *to
keep it on the GPU*. `filter: url(#…)` is the CPU route, and displacement was
only available down there. FEAT-057 took that route knowingly to get refraction
at all.

**What changed is the material.** TASK-020 settled the glass at `strength: 6`,
`chromaticAberration: 0`, `saturate: 0`, `blur: 10` — chosen by eye at the
window. At those values the refraction is a barely visible 6px ring, and it was
costing 86ms of every frame after the free optimisation and 180ms before it. The
frost the author actually wanted is exactly what `blur(10px) saturate(0)`
produces, on the GPU, for nothing.

## Change

- `--blur-thick` becomes `blur(10px) saturate(0)`, carrying TASK-020's settled
  material as a `backdrop-filter`.
- `Menu` and `DialogHost` drop `use:liquidGlass` and wear that frost directly.
- The lens modules and their tests are retired to `~/claudetrashbin` — see
  below.
- The shell's comments about what `.lens` is for are corrected; the element
  stays, because the layout still needs the column.

## What this removes besides the cost

The portal goes with the lens. A pane had to be moved out of the element it was
bending, on to a stage of its own, and that mechanism was the root cause of
BUG-018 — a menu that could not be dismissed, because the action moved the node
and never took it off again. With no filter there is nothing to move out of, so
that class of defect is gone rather than fixed.

The trigger toggle and the `focusout` route from BUG-018 are kept: both fix real
defects that have nothing to do with the portal.

## Non-scope

- Folding `.lens` back into `.app`. It is now only a layout column, and merging
  it is a tidy-up worth doing deliberately rather than as a passenger to a
  performance fix.
- The two thinner frost grades, `--blur-thin` and `--blur`. They were always
  `backdrop-filter` and were never part of the cost.

## Acceptance criteria

- A pane on screen costs no measurable frame time against none.
- The frost matches what TASK-020 settled, because it is the same two numbers.
- No `filter` is installed on any element at any time.
- Nothing imports the retired modules.

## Dependencies

Supersedes the mechanism FEAT-057 built. Takes its material from TASK-020.

## Amendment 6 — where the code went

`liquidGlass.ts`, `liquidGlassMaps.ts` and both test files are **moved**, not
deleted, to:

```
~/claudetrashbin/spagitty-TASK-022-liquid-glass-lens/
```

Around 500 lines of working, tested, well-documented code that solves a real
problem correctly — it is only the wrong trade on this renderer. FEAT-057's
record explains the whole approach, and the files are intact if a future
WebKitGTK makes `backdrop-filter: url(#…)` render, which is what would make the
lens cheap. The author decides whether they are deleted.
