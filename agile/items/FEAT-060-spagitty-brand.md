<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-060 — Spagitty, with a face: the brand

**Status:** Open — branch `feature/FEAT-060-spagitty-brand` in flight.
**Screens:** the app icon everywhere it ships; the backend repo's README.
**Raised by:** the author, by instruction — the icon predates Spagitty's name
and has never been given an identity to match it.

## Problem

Spagitty has a name, a palette, and an icon — but none of them were designed
as one thing. The icon was drawn in `tools/make-icons.py` (commit `d9b87bd`)
before the rename settled, with a homemade ground colour of its own choosing
rather than the app's `--panel`; there is no wordmark, no lockup, no favicon,
no tray/menubar mark, no README (the file at the repo root is 0 bytes), and no
written rule about what the mark is and how it may and may not be used.

## Change

- **The source mark is formalised.** `tools/make-icons.py` is rewritten as a
  parameterised generator: the same strand geometry, now drawn in the app's
  real tokens (lanes in `--lane-1`/`--lane-2` per theme, ground in `--panel`,
  the wheat accent kept), with a per-strand lane colour, a vector twin
  (`src-tauri/icons/mark.svg`), and a larger shipped set (16/32/128/256/512/
  1024 with `@2x`, `.ico`, `.icns`).
- **The full set of brand collateral is generated from that one mark.** New
  `tools/make-brand.py` renders the bare mark (`assets/brand/`), the wordmark
  lockups for dark and light surfaces (PNG + SVG), the single-strand S
  monogram, the favicon set, the README hero banner, and the tray/menubar
  marks (`menubar-mono` for macOS, `tray-white`/`tray-black` by tray tone) in
  `src-tauri/icons/`. The wordmark is set in Inter (SIL OFL 1.1), bundled in
  `assets/brand/font/` so generation is hermetic.
- **`docs/branding.md` is written**: the name's story, the mark's concept and
  construction, clearspace, the token palette in both themes, typography,
  do/don't (never the Git mark or its orange), asset inventory, and licence.
  `README.md` gains the hero and lives again.
- **The identity cannot silently drift.** `--check` modes regenerate to bytes
  in memory and diff against the committed files; both run in gate 2, so a
  hand-edited or broken icon fails the pull request.

## Non-scope

- **Redesigning the mark.** The strands-and-lanes idea is the identity; this
  item re-derives it in the true palette and builds the household around it.
- **The UI's other lane colours.** `--lane-3..5` and each theme's `--danger`
  are the app's, not the brand's; the mark will not grow them.
- **Wiring the tray icons into the running app.** The menu/tray surface is
  designed by a separate feature; this item provides the assets, not that
  feature.

## Acceptance criteria

- `tools/make-icons.py --check` and `tools/make-brand.py --check` pass from a
  clean clone with Pillow installed, and the committed `src-tauri/icons/` and
  `assets/brand/` trees match what they generate byte-for-byte.
- The app icon reads at 16, 32, 128 and 512 px, and renders in the app's dark
  `--panel` colour, matching the theme tokens in `docs/branding.md`.
- The lockups, monogram, favicon and hero exist in both theme variants where a
  variant makes sense, and the README hero renders from the new `README.md`.
- Gate 2 enforces the drift check; `docs/ci.md` documents it.
- No Git logo, mark, or orange anywhere; the brand file inventory in
  `docs/branding.md` is complete and accurate.

## Dependencies

Independent of the open pull requests; `gates.yml` is touched in a region the
FEAT-059 change does not overlap, so the two merge independently.