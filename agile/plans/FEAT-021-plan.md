<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-021 — Plan

## Context

Two things prompted this.

**The title bar carries two chips that should not be there.** `⌘K` (`TitleBar.svelte:55`)
navigates to `/search` — but the shortcut actually wired in `+layout.svelte:106` is
`⌘F` / `Ctrl+F`, so the label names a key combination that does nothing, in a
notation that is macOS's on a Linux machine. Beside it, `dark` (`TitleBar.svelte:52`)
is a light/dark toggle that predates the Settings screen; Appearance now owns
that, and having it in two places means two things to keep in step.

**The application has no visual system.** `src/app.css` says so itself: the hex
values are "wireframe placeholders and are expected to be replaced by the real
visual system; the names are not." That is why GitLord reads as a white program
and a black program rather than a designed one. The token *structure* is right
and every colour in the application already comes through it — there is no hex
literal anywhere outside `app.css`, and `LaneCanvas.svelte:28` resolves the lane
colours from the stylesheet at paint time — so the work is to supply real
palettes, not to re-plumb anything.

Decided with the author: four families — **Catppuccin, Dracula, Tokyo Night,
Gruvbox** — each with a light and a dark palette, eight in all. Catppuccin is
the default (Latte / Mocha). Dark Island is dropped. On first run the OS
preference chooses light or dark and nothing else; after that both the family
and the mode are whatever was last chosen.

## The shape

A palette is **data**, not a stylesheet. Eight `:root[data-theme=…]` blocks
would be the same eleven tokens written eight times with no way to test them;
instead one table in TypeScript is applied to the root element as inline custom
properties — the mechanism `panels.svelte.ts:35` and `metrics.ts:171` already
use for structural tokens. Inline properties beat the stylesheet, so `app.css`
keeps the default family as its boot values and there is no flash of the wrong
theme before the store runs.

### New — `src/lib/themes.ts`

Pure data and lookup, no DOM:

```ts
export type Mode = 'light' | 'dark';
export type FamilyId = 'catppuccin' | 'dracula' | 'tokyo-night' | 'gruvbox';

export interface Palette {
  bg, panel, ink, muted, line, soft, placeholder,
  accent, onAccent, selection, stripe: string;
  lanes: [string, string, string, string, string];
}

export interface Family { id: FamilyId; name: string;
                          light: { name: string; palette: Palette };
                          dark:  { name: string; palette: Palette }; }

export const FAMILIES: Family[];          // in the order Settings shows them
export const DEFAULT_FAMILY: FamilyId;    // 'catppuccin'
export function paletteOf(family: FamilyId, mode: Mode): Palette;
export function isFamily(value: string): value is FamilyId;
```

Variant names are each family's own, so the screen can say them: Latte/Mocha,
Alucard/Dracula, Tokyo Night Day/Tokyo Night, Gruvbox Light/Gruvbox Dark. The
token keys map 1:1 onto the CSS custom property names already in `app.css`
(`--bg`, `--panel`, …, `--lane-1`…`--lane-5`), so nothing else has to learn a
new name.

### Changed — `src/lib/theme.svelte.ts`

Gains a family beside the mode.

- `theme.mode` (`'light' | 'dark'`), `theme.family`, `theme.isDark`,
  `theme.id` (`"catppuccin-dark"`).
- `setMode`, `setFamily`, `toggle` (mode only), `init`.
- `apply()` writes every token of `paletteOf(family, mode)` onto
  `document.documentElement.style`, and keeps setting `data-theme` to the mode —
  `app.css` still keys its own two blocks off it, and it is what a stylesheet
  would need if one is ever added.
- Storage: `gitlord.theme` keeps holding the **mode**, so an existing install's
  choice survives; `gitlord.theme.family` is new. Both are read leniently — an
  unknown value falls back rather than throwing, as today.

`theme.value` becomes `theme.id`. Its two readers are `LaneCanvas.svelte`
(lines 29 and 51, where it exists to make the canvas repaint) and
`AppearanceSection.svelte`; the canvas keeps repainting because the id changes
on a family switch as well as a mode switch, which the old boolean could not
express.

### Changed — `src/app.css`

The `:root` block becomes Catppuccin Latte and `:root[data-theme='dark']`
becomes Mocha, with the header comment corrected: these are the default family's
values and the boot fallback, not placeholders, and the palettes themselves live
in `src/lib/themes.ts`.

### Changed — `src/lib/chrome/TitleBar.svelte`

Remove the `⌘K` chip and the theme chip, and the imports they were the only
users of (`goto`, `theme`, `Chip`). What is left: repository name, branch chip,
licence and version, window controls.

### Changed — `src/lib/settings/AppearanceSection.svelte`

Two rows. **Mode**: Light / Dark chips, as now. **Theme**: one button per
family, each showing the family's name, the variant name for the current mode,
and four swatches drawn from that family's own palette (`bg`, `panel`, `accent`,
`ink`) so the choice is visible before it is made. The current family is marked
the way the rest of the application marks a selection.

## Files

| File | Change |
| --- | --- |
| `src/lib/themes.ts` | new — the eight palettes and their lookup |
| `src/lib/themes.test.ts` | new |
| `src/lib/theme.svelte.ts` | family + mode, applies tokens to the root |
| `src/lib/theme.test.ts` | extended for the family, and the migration |
| `src/app.css` | default family as the boot values; comment corrected |
| `src/lib/chrome/TitleBar.svelte` | both chips removed |
| `src/lib/chrome/chrome.test.ts` | line 150's `⌘K` assertion inverted |
| `src/lib/settings/AppearanceSection.svelte` | family picker beside the mode |
| `src/lib/settings/sections.test.ts` | the picker |
| `docs/screens.md` | the chrome section, and 1K's Appearance |
| `agile/items/FEAT-021-themes.md`, `agile/plans/`, `agile/testing/` | the Amendment 12 triplet |

## Tests

**`themes.test.ts`** — the palettes are data, so this is where they are checked:
every family has both modes; every palette defines every token with a non-empty
value; every palette has exactly five lane colours and they are distinct; **ink
on bg reaches a 4.5:1 contrast ratio and muted on bg reaches 3:1** in all eight,
computed from relative luminance — a palette nobody can read is the failure mode
that matters and it is the one thing about a colour that can be asserted;
`onAccent` reaches 4.5:1 against `accent`; `paletteOf` and `isFamily` behave.

**`theme.test.ts`** — everything it asserts today, plus: a family is stored and
restored; an unknown stored family falls back to the default; **a stored mode
from before this change is still honoured** (no one loses their setting);
switching family or mode writes every token onto the root element; `id` changes
on both, which is what repaints the canvas.

**`sections.test.ts`** — the picker lists four families and marks the current
one; choosing one applies it; the variant names shown follow the mode.

**`chrome.test.ts`** — the title bar has neither a `⌘K` chip nor a theme
control.

## Verification

```sh
npm run check          # types
npm test               # suite
npm run coverage       # Amendment 10 floor, 70%
cargo test --workspace # unaffected, but the gate is the gate
```

Nothing Rust changes. Then, for the part a test cannot check — whether the
palettes actually look right — `npm run tauri dev`, cycle the eight
combinations from Settings → Appearance, and confirm the graph's lane canvas
repaints with each (it is the one surface that reads colours through
JavaScript). That is a visual check, so under Amendment 4 it happens only if you
hand me the wheel; otherwise I will stop at the headless gates and you drive
that last part.

## Branch and record

Amendment 13: `feature/FEAT-021-themes`, cut from the current tip
(`dff9145`, FEAT-012) as every screen branch in this repository has been.
Amendment 12: item, plan and both testing documents land with the code.

## What the contrast tests found

Written before the palettes were checked, and three published values did not
survive them — which is the point of asserting a colour rather than looking at
one.

- **Catppuccin Latte's pink, peach and yellow** sit at 2.3–2.6:1 on Latte's own
  background. As a one-pixel lane in the graph they are not there. Replaced with
  Latte's red and teal, and a darkened Latte green.
- **Latte's `on-accent`** at Latte's own base colour gave 4.3:1 on its blue.
  White gives 4.9:1.
- **Tokyo Night Day's blue** (`#2e7de9`) cannot carry white text — 4.0:1 — so a
  filled primary button failed. Darkened to `#1c62c4` for the accent; the
  original stays as the first lane, where 3:1 is the bar and it passes.
- **Tokyo Night Day's panel** was darker than its background, which put its blue
  foreground at 4.1:1. Tokyo Night Day's own sidebar is *lighter* than its
  background; using that gives 4.8:1.

Each departure is marked in `src/lib/themes.ts` where it is made, with the
number that forced it.
