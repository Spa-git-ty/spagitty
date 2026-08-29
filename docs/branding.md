# Spagitty Brand

Spagitty is a desktop Git client. Its name is *spa-gi-ty* — a portmanteau of
"spaghetti", because a repo without histories, remotes, and review trails is a
plate of tangled pasta, and a VCS's job is to straighten it into something
other tools can cook with.

This document is the reference for how that idea shows up as a mark and in a
wordmark. The assets it describes are all regenerated from one source of
truth; see [Sources and checks](#sources-and-checks).

## The mark

The mark is the author's own hand-drawn drawing: an **amber plate** with four
dark **strands** that start tangled at the top and read as a bundle drawing
toward the commit intent at the bottom. It is not a control-program render of
an idea — it is the hand drawing itself, and as such it is the settled
identity and is never redrawn.

The mark's geometry lives in `assets/brand/mark.svg` (a 912×953 viewBox: the
`#EEB04D` plate plus a `<g fill="#454447">` holding the strand paths). That
file is copied **verbatim** from the author's original and is the only geometry
the generators read — nothing re-draws the mark, so the icon cannot drift from
the drawing the author approved.

### Always

- Use the generated assets, or regenerate them. Never redraw the mark.
- Keep it flat — the amber plate and the dark strands, nothing more. No
  shading, gradients, shadows, or outlines.
- Place the mark on a panel or neutral ground where its amber plate can sit.

### Clearspace

Keep a clear margin around the mark of about one node's visual weight — in
practice a gap of roughly 1/20 of the mark's height. The lockup already
includes it.

### Never

- The Git project's mark, its logo, or its orange. Spagitty is not affiliated
  with and must not borrow from it — a lookalike is how users get confused.
- Drop shadows, glows, embossing, or any 3D effect.
- A busy background; place the mark on panel, ink, or a plain neutral.

## The wordmark

`spagitty` in **Inter** (SIL Open Font License 1.1), lowercase, weight 660,
letterspaced by 45 units per em. Accompanying the mark it forms the
**lockup** (mark left, wordmark right, gap one node's visual weight), which
ships in dark- and light-surface ink variants. Inter is bundled in
`assets/brand/font/` so generation never needs the network; the app itself
runs on the system font stack via `--font-ui` / `--font-mono`, which are
independent of the brand face.

## Colour

The mark itself is fixed — amber plate `#EEB04D` and dark strands `#454447` —
on every surface. The wordmark ink adapts to the surface it sits on.

### The mark

| element | value | use |
| --- | --- | --- |
| plate | `#EEB04D` | the amber ground of the mark |
| strands | `#454447` | the dark strands |
| wordmark (light surface) | `#454447` | the strand grey on light panels |
| wordmark (dark surface) | `#cdd6f4` | light ink on dark panels |

### The app accent

The app's interactive accent is the brand amber, darkened so text and controls
read on the surface they sit on:

| theme | `--accent` | contrast on bg | use |
| --- | --- | --- | --- |
| dark (Mocha, Dracula, Tokyo Night, Gruvbox dark) | `#EEB04D` | > 7:1 | accent on dark surfaces |
| light (Latte, Alucard, Tokyo Day, Gruvbox light) | `#976317` | 3.9–4.9:1 | accent on light surfaces |

`--warn` is unchanged and is allowed to sit beside the accent at a lower
contrast ratio than 3:1 in the light themes (measured 1.09–1.35:1); this is an
accepted trade so the identity keeps its amber hue across the UI.

## Sizing

- Mark minimum: 16 px on-screen (the favicon floor); at 16 the tangle reads
  as texture.
- Wordmark minimum: 24 px cap height.
- The application icon ships at 16/32/128/256/512/1024, with `@2x` variants and
  both platform icon formats (`.ico`, `.icns`), as `src-tauri/icons/`.

## Assets and sources

| asset | path | production |
| --- | --- | --- |
| Mark source (the one truth) | `assets/brand/mark.svg`, `src-tauri/icons/mark.svg` | copied verbatim from the author |
| App icon set | `src-tauri/icons/` | `tools/make-icons.py` |
| Mark (bare) | `assets/brand/brand-mark.png` | `tools/make-brand.py` |
| Lockups | `assets/brand/lockups/` (PNG dark/light, SVG) | `tools/make-brand.py` |
| Favicon | `assets/brand/favicon/` (`.ico`, 16/32/64) | `tools/make-brand.py` |
| Hero banner | `assets/brand/hero.png` | `tools/make-brand.py` |
| Sweep page | `assets/brand/preview.html` | `tools/make-brand.py` |
| Tray/menubar | `src-tauri/icons/{menubar-mono,tray-black,tray-white}` | `tools/make-brand.py` |
| Wordmark face | `assets/brand/font/Inter.ttf` (OFL 1.1, `OFL.txt`) | bundled |

Everything is deterministic: regeneration produces byte-identical files, so
`tools/make-icons.py --check` and `tools/make-brand.py --check` run in CI as a
drift guard (gate 2). Both require Pillow.

## Licence

The mark and collateral are part of Spagitty and are **GPL-3.0-or-later**,
like the rest of the repository. The wordmark typeface Inter is **SIL Open
Font License 1.1** (`assets/brand/font/OFL.txt`), which permits bundling and
redistribution with the project.
