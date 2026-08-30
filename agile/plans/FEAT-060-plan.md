<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-060 — Plan

**Item:** [`agile/items/FEAT-060-spagitty-brand.md`](../items/FEAT-060-spagitty-brand.md)

## Approach

Make one shared source of geometry the whole identity is derived from, then
derive. That source is the author's own hand-drawn mark, copied verbatim into
the tree — not a control-program approximation. The risk is in letting the
collateral be *drawn again* in ten places until the mark and the lockup stop
agreeing, so `tools/make-icons.py` becomes the rasteriser that reads the one
SVG and `tools/make-brand.py` imports it; a drift guard (`--check`, wired into
gate 2) makes the committed bytes the only other authority.

Rendering is Pillow-only and deterministic. The strand paths use the SVG
default nonzero winding rule, which Pillow's own `polygon` (even-odd) does not
implement, so a scanline fill applies the winding rule directly; output is
supersampled and LANCZOS-downscaled, which makes regeneration byte-identical.
The mark's plate is amber on every surface; the **app interactive accent**
tracks the brand amber (dark `#EEB04D`, light `#976317`) while `--warn` is
left unchanged.

The wordmark needs a typeface; Inter (SIL OFL) is bundled into the tree so
generation is deterministic and offline, and CI verifies rather than vendors
it again.

## Decisions

- **The author's drawing is the mark.** Amber plate `#EEB04D`, four dark
  strands `#454447`, on a 912×953 viewBox. It is copied byte-for-byte and the
  generated strands-and-lanes render is dropped. Nothing redraws the mark.
- **Full plate in the app icon; strands alone in tray/menubar.** The squarish
  953-high plate maps onto a square icon by `xMidYMid meet` with a hair of
  transparent frame. Tray/menubar marks are the strands without the plate in
  one tray-adapted tone, because an amber plate would not read at 18–22 px.
- **Inter as the wordmark face, committed.** The app runs on the system font
  stack (`--font-ui`/`--font-mono`); the *brand* face needs to be loadable by
  Pillow in CI with no network. Bundled font + `OFL.txt` satisfies that.
- **Two lockup inks, one mark.** The mark is identical in both; the wordmark
  takes a light ink on dark surfaces and the strand grey on light surfaces.
- **Deterministic regeneration, diffed in CI.** `--check` recomputes every
  committed file in memory and byte-compares — no timestamps in PNG/SVG/ICO
  outputs means this is reliable. A manual redraw of the icon now fails the
  branch, on purpose.

## Files

- `tools/make-icons.py` — SVG rasteriser + icon-set CLI (`--check`)
- `tools/make-brand.py` — lockups, favicon, hero, tray/menubar, `preview.html`
- `assets/brand/mark.svg`, `src-tauri/icons/mark.svg` — the author's mark
- `src-tauri/icons/` — regenerated set, tray/menubar
- `assets/brand/` — mark, lockups, favicon, hero, `font/`, `preview.html`
- `docs/branding.md`, `docs/ci.md` — the guide, and the drift step in the
  pipeline documentation
- `src/lib/themes.ts`, `src/app.css` — accent to the brand amber
- `.github/workflows/gates.yml` — gate 2 drift step
- `README.md` — written from zero bytes: hero, intro, docs links, licences
- `agile/` — this triplet and the index row; `CHANGELOG.md`

## Steps

1. Copy `~/Pictures/spagitty.svg` verbatim into `assets/brand/mark.svg` and
   `src-tauri/icons/mark.svg`; validate byte-identity.
2. Rewrite `tools/make-icons.py` (SVG parse, nonzero fill, supersample, full
   size set, `--check`); validate the raster against librsvg at native size.
3. Rewrite `tools/make-brand.py`; keep the bundled Inter + `OFL.txt`.
4. Apply the brand accent (`themes.ts` + `app.css` mirrors); confirm the
   contrast rules still pass.
5. Regenerate everything with a Pillow venv; sanity-check geometry headlessly.
6. Write `docs/branding.md`, `README.md`, reconcile `docs/ci.md`.
7. Triplet + index row + changelog; commit; push the `feature/FEAT-060-…`
   branch; open the pull request (the author's window review happens there —
   Amendment 4 keeps the wheel with the author).

## Risks and rollback

- **The raster could drift from the vector.** The nonzero-winding fill and
  supersampling are validated against librsvg (sub-pixel edge differences only,
  interiors byte-equal); the SVG itself is the input and never edited.
- **Pillow in CI.** Gate 2 is Python's stdlib `pip install pillow`; the
  scripts avoid any non-Pillow dependency. `--check` is pure verification, so
  a Pillow regression fails the gate loudly rather than silently shipping a
  stale icon.
- **Cherry-picked logos.** A screenshot drawn from the Git project could leak
  in disguised as colour-correction. The brand guide's explicit prohibition
  and the CI drift check together cover the copy path; visual review covers
  the rest.