<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-060 — Spagitty, with a face: the brand

**Status:** Done.
**Screens:** the app icon everywhere it ships; the backend repo's README.
**Raised by:** the author, by instruction — the icon predates Spagitty's name
and has never been given an identity to match it.

## Problem

Spagitty has a name, a palette, and an icon — but none of them were designed
as one thing. The icon was drawn in `tools/make-icons.py` (commit `d9b87bd`)
as a control-program approximation of the idea — strands and lanes in the
app's token colours — rather than a settled drawing. There is no wordmark, no
lockup, no favicon, no tray/menubar mark, no README (the file at the repo
root is 0 bytes), and no written rule about what the mark is and how it may
and may not be used.

## Change

- **The mark is the author's drawing, and becomes the one truth.** The
  author's own hand-drawn mark — an amber plate (`#EEB04D`) with four dark
  strands (`#454447`) on a 912×953 viewBox — is copied **verbatim** into
  `assets/brand/mark.svg` and `src-tauri/icons/mark.svg`. It is the settled
  identity and is never redrawn; the generated strands-and-lanes render is
  abandoned.
- **The generators rasterise that SVG, deterministically.** `tools/make-icons.py`
  is rewritten to parse the SVG and render it with Pillow only (a
  nonzero-winding scanline fill, supersampled, LANCZOS downscaled), producing
  the app icon set (16/32/128/256/512/1024 with `@2x`, `.ico`, `.icns`).
- **The brand collateral is generated from that one mark.** `tools/make-brand.py`
  renders the bare mark, the wordmark lockups for dark and light surfaces
  (PNG + SVG), the favicon set, the README hero banner, and the tray/menubar
  marks (the strands alone, no plate: `menubar-mono` for macOS,
  `tray-white`/`tray-black` by tray tone). The wordmark is set in Inter
  (SIL OFL 1.1), bundled in `assets/brand/font/` so generation is hermetic.
- **The app's accent follows the brand amber.** The interactive accent is
  `#EEB04D` on dark surfaces and darkened to `#976317` on light ones; `--warn`
  is left unchanged.
- **`docs/branding.md` is written**: the name's story, the mark and its
  construction, clearspace, the palette, typography, do/don't (never the Git
  mark or its orange), asset inventory, and licence. `README.md` gains the
  hero and lives again.
- **The identity cannot silently drift.** `--check` modes regenerate to bytes
  in memory and diff against the committed files; both run in gate 2, so a
  hand-edited or broken icon fails the pull request.

## Non-scope

- **Redesigning the mark.** The author's hand drawing is the identity; this
  item builds the household around it and does not redraw it.
- **The UI's other lane colours.** `--lane-3..5` and each theme's `--danger`
  are the app's, not the brand's; the mark will not grow them.
- **Wiring the tray icons into the running app.** The menu/tray surface is
  designed by a separate feature; this item provides the assets, not that
  feature.

## Acceptance criteria

- `tools/make-icons.py --check` and `tools/make-brand.py --check` pass from a
  clean clone with Pillow installed, and the committed `src-tauri/icons/` and
  `assets/brand/` trees match what they generate byte-for-byte.
- `assets/brand/mark.svg` is byte-identical to the author's original.
- The app icon reads at 16, 32, 128 and 512 px.
- The lockups, favicon and hero exist, and the README hero renders from the
  new `README.md`.
- Gate 2 enforces the drift check; `docs/ci.md` documents it.
- No Git logo, mark, or orange anywhere; the brand file inventory in
  `docs/branding.md` is complete and accurate.

## Dependencies

Independent of the open pull requests; `gates.yml` is touched in a region the
FEAT-059 change does not overlap, so the two merge independently.