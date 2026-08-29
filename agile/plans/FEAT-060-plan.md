<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-060 — Plan

**Item:** [`agile/items/FEAT-060-spagitty-brand.md`](../items/FEAT-060-spagitty-brand.md)

## Approach

Make one shared source of geometry the whole identity is derived from, then
derive. The already-shipped strands-and-lanes mark was drawn through a control
program; the risk here is not in the drawing itself but in letting the
collateral be *drawn again* in ten places until the mark and the lockup stop
agreeing. So `tools/make-icons.py` becomes the geometry module and
`tools/make-brand.py` imports it; a drift guard (`--check`, wired into gate 2)
makes the committed bytes the only other authority.

The palette is not invented: each theme's `--panel`, `--lane-1`, `--lane-2`
and ink tokens are read straight out of `src/app.css`, and the wheat accent
that has always been in the mark is kept. The wordmark needs a typeface;
Inter (SIL OFL) is bundled into the tree so generation is deterministic and
offline, and CI verifies rather than vendors it again.

## Decisions

- **Keep the geometry, change the palette.** The tangle-to-lanes idea and the
  strand maths (SWING/DECAY/TURNS, clip at `TOP=-0.18`, disc-stamped stroke,
  back-to-front drawing) are the mark. Churn is reserved for where it shows:
  true token colours, per-strand lane colours, a real node ring, a genuine
  vector source, and a full set of sizes.
- **Bare mark in the lockup.** The app icon wears the ground plate; the
  lockup shows the strands on transparency so one art works on any surface.
- **Inter as the wordmark face, committed.** The app runs on the system font
  stack (`--font-ui`/`--font-mono`); the *brand* face needs to be loadable by
  Pillow in CI with no network. Bundled font + `OFL.txt` satisfies that.
- **Dark on light, light on dark.** The mark ships default-dark (the app
  icon's look) and a light variant with a darkened wheat tuned for the light
  `--panel`. Lockups exist for both surfaces.
- **Deterministic regeneration, diffed in CI.** `--check` recomputes every
  committed file in memory and byte-compares — no timestamps in PNG/SVG/ICO
  outputs means this is reliable. A manual redraw of the icon now fails the
  branch, on purpose.

## Files

- `tools/make-icons.py` — geometry module + icon-set CLI (`--check`, `mark.svg`)
- `tools/make-brand.py` (new) — lockups, monogram, favicon, hero, tray/menubar
- `src-tauri/icons/` — regenerated set + `16/256/512`, `mark.svg`, tray/menubar
- `assets/brand/` (new) — mark, lockups, monogram, favicon, hero, `font/`
- `docs/branding.md` (new), `docs/ci.md` — the guide, and the drift step in the
  pipeline documentation
- `.github/workflows/gates.yml` — gate 2 drift step
- `README.md` — written from zero bytes: hero, intro, docs links, licences
- `agile/` — this triplet and the index row; `CHANGELOG.md`

## Steps

1. Rewrite `tools/make-icons.py` (palette from tokens, per-strand lane colour,
   full size set, `--check`, `mark.svg`).
2. Write `tools/make-brand.py`; bundle Inter + `OFL.txt`.
3. Regenerate everything with a Pillow venv; sanity-check geometry (bounds,
   alpha, dimensions) headlessly.
4. Write `docs/branding.md`, `README.md`, the gate-2 drift step, and reconcile
   `docs/ci.md`.
5. Triplet + index row + changelog; commit; push the `feature/FEAT-060-…`
   branch; open the pull request (the author's window review happens there —
   Amendment 4 keeps the wheel with the author).

## Risks and rollback

- **The mark's look could shift.** Geometry is untouched, but the ground
  colour and lanes change to real tokens. That is the point of the item, and
  it is the author's call at the window; the whole set regenerates from one
  commit, so rollback is a revert.
- **Pillow in CI.** Gate 2 is Python's stdlib `pip install pillow`; the
  scripts avoid any non-Pillow dependency. `--check` is pure verification, so
  a Pillow regression fails the gate loudly rather than silently shipping a
  stale icon.
- **Cherry-picked logos.** A screenshot drawn from the Git project could leak
  in disguised as colour-correction. The brand guide's explicit prohibition
  and the CI drift check together cover the copy path; visual review covers
  the rest.