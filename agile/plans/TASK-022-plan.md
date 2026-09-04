<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-022 — Plan

**Item:** [`agile/items/TASK-022-the-glass-goes-back-on-the-gpu.md`](../items/TASK-022-the-glass-goes-back-on-the-gpu.md)

## Measure first

The author's instruction, and the right one. Three fixes earlier in the same
session had been argued from reading the source and two of them were wrong, so
nothing here was changed until there were numbers.

**How.** A profiler on a throwaway branch: `build()` wrapped in
`performance.now()`, a `requestAnimationFrame` loop recording frame intervals
into two buckets by whether a pane was registered, a pane cycled on and off
every eight seconds, and a small element transformed every frame so the
compositor had continuous work — a frame time measured on an idle compositor
means nothing. Results rendered into a fixed overlay and read off a screenshot,
since WebKitGTK under Tauri does not forward `console.log` and no inspector was
to hand.

**What it showed, and this is the part worth keeping.** `build()` was 0.00ms
median. The entire cost was rasterisation. The three optimisations that looked
obvious from reading — cache the data URIs, coalesce the duplicate rebuilds,
stop re-encoding on every move — target JavaScript that was already free, and
would have produced a careful, well-tested, measurable improvement of nothing.

Collapsing the three identical displacement passes to one *did* halve it, 196ms
to 102ms, because that is rasterisation. It is still ten frames a second, which
is what settled the direction: the lens is not slow because it is unoptimised,
it is slow because a sixteen-primitive full-window CPU filter is what it is.

## Approach

Put the frost back where WebKit accelerates it.

`--blur-thick` becomes `blur(10px) saturate(0)` — the material TASK-020 settled,
expressed in the two built-in filter functions WebKit keeps on the GPU. `Menu`
and `DialogHost` drop `use:liquidGlass` and wear it directly. Nothing installs a
`filter` on anything.

The refraction goes. At `strength: 6` and `chromaticAberration: 0` it is a 6px
ring nobody would identify in a screenshot test, and it was the whole cost.

## Alternatives considered

**Keep the lens behind a Settings toggle.** Rejected, and the author agreed:
two rendering paths is two to keep correct forever, and the second one is
correct today only in the sense that nobody uses it. FEAT-057's record is a
better preservation of the work than a switch nobody turns on.

**Optimise the lens harder** — clip before blurring, shrink the filter region to
the pane's neighbourhood, cache the maps. Each is real, and together they might
have reached 40–50ms. That is still three frames' worth of budget for an effect
measured at zero on the other path.

**Wait for `backdrop-filter: url(#…)`.** It is the thing that would make the
lens cheap, there is a W3C issue open, and it is not a plan.

## Files

- `src/app.css` — `--blur-thick`.
- `src/lib/ui/Menu.svelte`, `src/lib/ui/DialogHost.svelte` — the action goes,
  the frost returns.
- `src/routes/+layout.svelte` — the comments about what `.lens` is for.
- Moved to `~/claudetrashbin/spagitty-TASK-022-liquid-glass-lens/`:
  `liquidGlass.ts`, `liquidGlassMaps.ts` and both test files.

## Risks

**The panes lose their edge.** They already lost the drawn shoulder earlier in
the session, and now the refracted ring as well, leaving tint and cast shadow.
The sweep looks at a pane over a dark region of the commit list specifically for
this. If it needs an edge back, `--glass-rim-thick` is still defined and unused
and is one declaration away.

**Coverage moves.** Four files leave, two of them tests: 1870 tests become 1829.
The floor is measured on what remains and is unaffected — 85.98% statements,
74.71% branches.

**Something still imports the modules.** Checked by `npm run check` over the
whole project after the move, which is what would fail.

## Rollback

Move the four files back and restore `use:liquidGlass` on the two panes.
Nothing else depends on the change.
