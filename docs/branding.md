# Spagitty Brand

Spagitty is a desktop Git client. Its name is *spa-gi-ty* — a portmanteau of
"spaghetti", because a repo without histories, remotes, and review trails is a
plate of tangled pasta, and a VCS's job is to straighten it into something
other tools can cook with.

This document is the reference for how that idea shows up as a mark and in a
wordmark. The assets it describes are all regenerated from one source of
truth; see [Sources and checks](#sources-and-checks).

## The mark

The mark reads two ways at once, which is the whole joke:

- three strands start **tangled** at the top and **straighten** into parallel
  commit lanes at the bottom;
- each lane **ends in a node** — the commit you're looking at.

The tangle is clipped by the frame, so it reads as continuing beyond the icon
rather than as three stubby hooks.

The strands are sine waves whose amplitude decays as they descend. The wheat
strand runs uppermost at the very top of the tangle and crosses over the lanes
it grabs. The other two lanes hold two different lane colours, so the graph
half reads as distinct lines, not one smudge.

### Always

- Use the generated assets, or regenerate them. Never redraw the mark.
- Keep the strands **flat** with no shading, gradients, or outlines — the
  brand is the two-tone lane palette on a panel colour, nothing more.
- Prefer the dark version (lanes + wheat on `--panel` `#181825`) on any
  surface; it is the shipped app icon.

### Clearspace

Clearspace is one node diameter (a node is `0.088` of the mark's height)
around every edge of the mark. The lockup already includes it.

### Never

- The Git project's mark, its logo, or its orange. Spagitty is not affiliated
  with and must not borrow from it — a lookalike is how users get confused.
- Drop shadows, glows, embossing, or any 3D effect.
- A busy background; place the mark on panel, ink, or a plain neutral.

## The wordmark

`spagitty` in **Inter** (SIL Open Font License 1.1), lowercase, weight 760,
letterspaced by 45 units per em. Accompanying the mark it forms the
**lockup** (mark left, wordmark right, gap one node diameter). Inter is
bundled in `assets/brand/font/` so generation never needs the network; the
app itself runs on the system font stack via `--font-ui` /
`--font-mono`, which are independent of the brand face.

The single-strand **monogram** — one Pasta strand forming an S, capped with a
commit node — is for favicons, tray badges, and whatever tiny surface the full
mark can't survive.

## Colour

All colours are the app's own tokens from `src/app.css`. The mark uses
`--lane-1`, `--lane-2`, and the wheat accent; the other lane colours are
reserved for the UI's own graphs and must not drift into the mark.

### Dark (default)

| token | value | use |
| --- | --- | --- |
| `--panel` | `#181825` | mark ground, app panels |
| `--lane-1` | `#89b4fa` | first commit lane |
| `--lane-2` | `#cba6f7` | second commit lane |
| — | `#e2b760` | the wheat/pasta strand |
| `--ink` | `#cdd6f4` | wordmark on dark surfaces |
| `--accent` | `#89b4fa` | interactive accent (UI only) |
| `--danger` | `#f38ba8` | destructive actions (UI only) |

### Light

| token | value | use |
| --- | --- | --- |
| `--panel` | `#e6e9ef` | mark ground on light surfaces |
| `--lane-1` | `#1e66f5` | first commit lane |
| `--lane-2` | `#8839ef` | second commit lane |
| — | `#ce8a2e` | wheat darkened for the light ground |
| `--ink` | `#4c4f69` | wordmark on light surfaces |

The UI defines `--lane-3..5` and `--danger` in each theme; those exist for
the app's graphs and are not brand colours.

## Sizing

- Mark minimum: 16 px on-screen (the favicon floor); at 16 the tangle reads
  as texture and the nodes as the three dots.
- Wordmark minimum: 24 px cap height; below that, use the monogram.
- The application icon ships at 16/32/128/256/512/1024, with `@2x` variants
  and both platform icon formats (`.ico`, `.icns`), as `src-tauri/icons/`.

## Assets and sources

| asset | path | production |
| --- | --- | --- |
| App icon set | `src-tauri/icons/` | `tools/make-icons.py` |
| Mark (bare) | `assets/brand/brand-mark.png` (+ light), `src-tauri/icons/mark.svg` | `tools/make-icons.py --write-svg` |
| Lockups | `assets/brand/lockups/` (PNG dark/light, SVG) | `tools/make-brand.py` |
| Monogram | `assets/brand/monogram.png` | `tools/make-brand.py` |
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