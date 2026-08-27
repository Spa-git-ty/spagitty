<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-057 — Plan

**Item:** [`agile/items/FEAT-057-liquid-glass.md`](../items/FEAT-057-liquid-glass.md)
**Branch:** `feature/FEAT-057-liquid-glass`
**Base:** `356142f`, not `dev`. `dev` sits 71 commits behind and has none of the
glass this builds on; the author approved that base with the plan.

## Approach

Displace the application, not the backdrop.

WebKitGTK renders nothing for `backdrop-filter: url(...)`, so the pane cannot
bend its own backdrop. What it can do is sit on top of something that has
already been bent: an ordinary `filter` on the element underneath, carrying a
displacement ring in the exact shape of each open pane.

Four pieces, in this order:

1. **Split the arithmetic out of the DOM.** `liquidGlassMaps.ts` takes numbers
   and returns strings — maps, mask, filter. `liquidGlass.ts` keeps the parts
   that need a document.
2. **Give the filter something to sit on.** A `.lens` wrapper inside `.app`.
3. **Wire the two floating panes** — `Menu` and `DialogHost`.
4. **Test the arithmetic and the registry**, headlessly.

### Why the split is the first step and not tidying afterwards

Every way this effect fails is a number: a map authored in the wrong units puts
the ring up and to the left of its pane, a band wider than the pane turns an
edge into a smear, the wrong `k4` on the composite tints the whole window. None
of that throws, none of it fails a type check, and all of it is visible only
with the application open on a display of the right scale — which Amendment 4
says is not how this repository verifies anything.

Split out, those are twenty-five assertions that run in 200ms. Left inside the
action they are untestable without a browser, and 400 lines of `src/lib` sit at
zero coverage against the Amendment 10 floor.

### Why `.lens` and not `.app`

A filter clips to the border box. `.app` draws the window's outline and its cast
shadow *outside* that box, so filtering it would cut the window's own edge off
for as long as a menu was open. Growing the filter region past the box is worse:
the displacement maps then stop covering it, and `feDisplacementMap` over a map
that is not there produces colour-fringed rubbish in the uncovered band.

`.lens` fills `.app` exactly and draws nothing of its own, so the region can be
its box and nothing visible is lost. `.app` keeps the radius, the outline and
both shadows; `.lens` takes the column layout, because a filtered element is the
containing block for its fixed descendants and the chrome has to be laid out
inside the thing being filtered.

### Why a pane is moved out of the tree

A pane inside the filtered subtree would be displaced along with everything
else — it would bend itself. `Menu` is raised by whichever component was
right-clicked, usually deep inside `.main`, so the action moves it to a
window-sized stage outside `.lens`.

Not into `document.body` directly: `body > div { height: 100% }` in `app.css`
sizes the shell, and a menu appended to the body becomes a `body > div` and is
stretched to the full height of the window. The stage absorbs that rule.

`DialogHost` is already mounted beside the shell rather than inside it, so it is
registered and not moved — moving it would take it out of the backdrop that
centres it. The action checks `target.contains(node)` rather than assuming
either.

### Why one filter for the window

A menu can be open over a dialog. Two filters would double-displace the overlap
and cost two composited layers; one filter that knows about both panes is
cheaper and correct at the overlap. The thickest pane on screen sets the
material, ties going to whichever registered first, so a menu opening over a
dialog does not restyle the dialog.

### The device-pixel pre-multiply

WebKit rasterises an `feImage` source at the size of the filter subregion in
*user* units and blits it into a surface running at *device* resolution. On a
scaled desktop every coordinate in the map is then read as a device pixel and
the whole map arrives shrunk by one over the scale factor — the ring lands up
and to the left of its pane.

Neither a `viewBox` nor a device-sized `width`/`height` fixes it; both were
tried. What does is authoring the contents in CSS pixels and scaling the lot by
`devicePixelRatio` in one transform on the way out.

## Files

| File | What changes |
| --- | --- |
| `src/lib/ui/liquidGlassMaps.ts` | new — the pure arithmetic |
| `src/lib/ui/liquidGlass.ts` | the action, now DOM only |
| `src/routes/+layout.svelte` | the `.lens` wrapper and its style |
| `src/lib/ui/Menu.svelte`, `src/lib/ui/DialogHost.svelte` | one `use:` each |
| `src/app.css` | the sheen out, `--glass-rim-thick` in |
| `docs/screens.md` | the window section says what the glass is and why it is built this way |

## Testing

`liquidGlassMaps.test.ts` for the arithmetic and `liquidGlass.test.ts` for the
registry — 41 assertions, both headless. The registry tests import the module
fresh per test, because one filter for the window means module state, and a test
that inherited the previous test's panes would pass for the wrong reason.

Coverage after: `liquidGlass.ts` 98.64% of statements, and the frontend total
rises from 84.56% to 85.95% — a module that would have sat at zero.

## Risk

The effect is expensive on a window that FEAT-055 measured as rasterizing on the
CPU. Three mitigations are in the design rather than promised for later: one
filter for the whole window, rebuilds coalesced onto a frame, and the filter
removed entirely when the last pane closes.

The residual risk is a WebKit version where `feImage` with a data URI behaves
differently. The failure mode is visible and total — no refraction, or a fringed
band — not a subtle wrong number, so it will be reported the first time it is
seen rather than shipping unnoticed.

## Rollback

Remove the two `use:` directives. The panes keep their tint and their rim and
lose the bend; `.lens` becomes an inert wrapper, and nothing else in the layout
depends on it.
