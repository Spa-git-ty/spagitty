<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-021 — Automated tests

## Run result

```
npm test                   714 passed, 0 failed   (40 files)
npm run check              953 files, 0 errors
cargo test --workspace     284 passed, 0 failed   (unchanged; no Rust in this item)
```

Up from 685 at FEAT-012: 29 frontend tests — 18 in `themes.test.ts`, 15 in a
rewritten `theme.test.ts` (up from 9), 4 more in `sections.test.ts`, and the
title bar's two.

## Coverage against the Amendment 10 floor of 70%

| Tree | Statements | Branches | Functions | Lines |
| --- | --- | --- | --- | --- |
| Frontend (`src/lib/**`) | 95.98% | 82.59% | 93.88% | 97.09% |
| `src/lib/theme.svelte.ts` | 97.29% | 93.75% | 100.00% | 100.00% |

`src/lib/themes.ts` is a table of constants with four lookups; every line of it
is executed by `themes.test.ts`. Nothing Rust changed.

## `themes.test.ts`, 18 tests

The palettes are data, so this is where they are checked. The file carries its
own colour maths — parse, composite, relative luminance, WCAG ratio — because
the alternative is trusting eight palettes because they look fine on the
author's monitor.

### The set

| Test | Asserts |
| --- | --- |
| `is four families, each with a light and a dark variant` | Eight palettes, every variant named |
| `names each variant the way its family names it` | Latte/Mocha, Alucard/Dracula, Day/Night, Light/Dark — "Mocha" says more than "dark" to anyone who chose Catppuccin |
| `has no two families sharing an id` | The id is the storage key |
| `opens on the default family, which is first in the list` | Criterion 7's data half |

### Every palette

| Test | Asserts |
| --- | --- |
| `defines every token` | Sixteen tokens in all eight. One missing would leave whatever the previous theme set — how half a theme ends up on screen |
| `carries exactly five distinct lane colours` | A repeated lane colour is two branches drawn the same |
| `uses colours this application can actually parse` | Hex or `rgba()`, nothing exotic |

### Readability — criteria 5 and 6

| Test | Asserts |
| --- | --- |
| `puts ordinary text at 4.5:1 or better against the background` | `ink` on both `bg` and `panel` |
| `keeps secondary text legible at 3:1, composited over what shows through` | `muted` is translucent in every palette, so its ratio depends on what is behind it — which is why the test composites rather than measuring the colour on its own |
| `keeps text on a filled accent surface at 4.5:1` | The primary button. Criterion 6 |
| `keeps the accent itself visible against the background at 3:1` | It is a border and a link colour as well as a fill |
| `keeps every lane colour distinguishable from the background at 3:1` | A lane nobody can see is a graph with edges missing |

**These found three real defects in published palettes**, which is the reason
they exist rather than a checklist item:

- Catppuccin Latte's pink, peach and yellow at 2.3–2.6:1 as lanes.
- Latte's own base colour on its blue at 4.3:1 for a filled button.
- Tokyo Night Day's blue carrying white text at 4.0:1, and its panel putting its
  blue foreground at 4.1:1.

Each is fixed and marked in `src/lib/themes.ts` with the number that forced it.

### Lookup and properties

| Test | Asserts |
| --- | --- |
| `finds a family by id` | |
| `falls back to the default rather than failing on an id it does not know` | The id comes from `localStorage`, which a person can edit — criterion 4 |
| `recognises exactly the families in the list` | Including that `'dark'` and `'Catppuccin'` are not families |
| `returns the variant for the mode asked for` | |
| `names every token the way the stylesheet names it` | `--on-accent`, `--lane-1`… — the one place the two naming schemes meet |
| `produces one property per token, and no others` | Sixteen properties, none empty, and the lane array never leaks as `--lanes` |

## `theme.test.ts`, 15 tests

| Group | Asserts |
| --- | --- |
| Applying | The mode lands on `data-theme`; **every token of the chosen palette is written to the root**, checked against `properties()` rather than a sample; changing family replaces them; toggling moves the mode and leaves the family; `id` names both, which is what repaints the lane canvas (criterion 2); `variant.name` is the family's own word; both halves persist |
| `init` | A stored family and mode are restored; **a mode stored before families existed is still honoured** and gains the default family, so no installation loses its setting (criterion 3); a stored mode beats the OS preference; the OS preference is the fallback; a stored value that is not a mode, and one that is not a family, are both ignored (criterion 4); unreadable storage does not throw; no `matchMedia` means light |

## `sections.test.ts` — Appearance, 5 tests

| Test | Asserts |
| --- | --- |
| `marks the mode in use and switches to the other one` | |
| `offers every family, marking the one in use` | Criterion 1 |
| `applies a family when it is chosen` | The root's `--bg` is that family's, so the click reached the document and not just the store |
| `names each family the way that family names the variant in use` | Latte and Alucard in light; Mocha and no Alucard in dark |
| `shows each family in the mode that is on, not in the other one` | A light preview of a theme about to be used in the dark is a preview of something nobody will see |

## `chrome.test.ts` — the title bar, 2 tests

| Test | Asserts |
| --- | --- |
| `carries no shortcut hint, because the one it carried was wrong` | No `⌘K`. Criterion 8 |
| `carries no theme control, because Settings owns the theme` | No `dark`/`light` chip. Criterion 8 |

## Not covered by automated tests

- **Whether the palettes look right** — contrast is measurable and taste is
  not. Every ticket in the sweep is a pair of eyes on something a ratio cannot
  answer.
- **The first paint being the default family** (criterion 7) happens before any
  test framework is running; the boot values in `src/app.css` are asserted only
  by being read. SWEEP-1M-08.
- **The lane canvas actually repainting** (criterion 2) is a canvas; the test
  asserts the dependency that triggers it (`theme.id` changing), not the pixels.
  SWEEP-1M-03.
- **Surviving a restart** (criterion 3) needs a restart. SWEEP-1M-06.
