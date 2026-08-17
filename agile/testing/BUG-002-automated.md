<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-002 — Automated tests

## Run result

```
npm test        790 passed, 0 failed   (46 files)
npm run check   979 files, 0 errors, 0 warnings
cargo test      272 passed, 0 failed   (untouched by this fix)
```

Up from 785: five tests in `src/lib/ui/btn.test.ts`.

## Coverage

`src/lib/ui/Btn.svelte` is markup and CSS with one derived class expression;
the two mounting tests cover it. The frontend totals are unchanged by this fix
(79.26% statements), and the standing branch-coverage gap noted in
`FEAT-020-automated.md` is unaffected.

## `src/lib/ui/btn.test.ts`, 5 tests

| Test | Asserts |
| --- | --- |
| `never sets a background on a selector that also matches the glow` | The defect itself: every `background` declaration in the component belongs to a selector that excludes `.glow`. This fails against the pre-fix source |
| `excludes the glow from the transparent fill` | `.btn:not(.glow)` exists and is what carries `background: transparent` |
| `leaves the accent fill to the glow rule in app.css` | The global rule still paints both layers — `padding-box` fill and `border-box` ring |
| `still fills a glow button that cannot animate` | `:disabled` and `prefers-reduced-motion` drop the animation, never the fill — the same failure wearing a different hat |
| `marks a primary button as glowing unless it is asked not to` | `primary` adds `glow`; `quiet` withholds it. Mounted for real |

**Why these read the stylesheet rather than the rendered button.** The test
environment mounts components without applying CSS, so `getComputedStyle` on a
mounted button reports the initial value for everything and would have passed
against the broken code. Asserting the rule is the honest version of this test:
it fails on the source that caused the bug, and it cannot pass by accident.

## Verified in the running application

The paint itself was checked over the DevTools protocol against the dev server,
before and after, because that is the only place the cascade actually runs:

| | Before | After |
| --- | --- | --- |
| `background-image` | `none` | `linear-gradient(rgb(30,102,245), …), conic-gradient(from 193deg, …)` |
| `border-color` | `rgba(76,79,105,0.26)` | `rgba(0,0,0,0)` — the ring shows through |
| `color` | `rgb(255,255,255)` | unchanged; now on an accent fill |

A screenshot of the toolbar confirms the blue pill with a white label and the
ring's bright head.

## What is not covered by automation

- That the fill is *legible* in all eight palettes. `themes.test.ts` already
  holds `--on-accent` on `--accent` to 4.5:1, so the contrast is covered; what
  is not is that every palette's button looks right, which is SWEEP-002-03.
- The animation. A travelling conic gradient is not assertable in happy-dom.
