<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-060 — Automated tests

**Item:** [`agile/items/FEAT-060-spagitty-brand.md`](../items/FEAT-060-spagitty-brand.md)

## What was tested

The brand work is deterministic generation from the author's SVG, so the
automated proof is: does the committed tree still match the generators, is the
raster faithful to the vector, and is the geometry sane?

| Command | Result |
| --- | --- |
| `python3 tools/make-icons.py` then `… --check` | regenerates clean; `--check` reports **icon set matches the committed sources** |
| `python3 tools/make-brand.py` then `… --check` | regenerates clean; `--check` reports **brand collateral matches the committed sources** |
| SVG identity | `assets/brand/mark.svg` and `src-tauri/icons/mark.svg` are byte-identical to the author's original (same SHA-256) |
| Raster fidelity | pure-Pillow render vs librsvg at native 912×953 differs on ~30 px (sub-pixel strand edges, delta >40); interiors byte-equal; no nonzero/even-odd holes |
| PNG/alpha geom: `icon.png` | 512², plate full-frame (alpha 0–255), strands+tangle within frame |
| Bare mark (`brand-mark.png`) | 512² transparent frame; content bbox `(25,19)-(488,495)`, amber plate present |
| `hero.png` | 1600×400, mark + wordmark banner |
| `lockup-ink-light.png` | 1253×682, mark + wordmark in one row (`bbox (93,86)-(1183,598)`) |
| `menubar-mono.png` | 18×18 from a 36² mono render, strands only (0 amber pixels), alpha-only shape |
| `tray-white.png` / `tray-black.png` | 22×22 from 44² mono renders, strands only, no plate |
| SVG sources (`mark.svg`, `lockup.svg`) | mark is the verbatim input; lockup references it |
| Contrast | each theme's `--accent`/`--onAccent` clears the 3:1 (on bg) and 4.5:1 (onAccent) bars; `bun run test` (1939 tests) green |

The suite itself does not import the generators; instead the gate-2 drift step
(`pip install pillow`, both `--check` flags) is the perpetual regression test —
a future bump of the geometry that is not committed to the tree fails the pull
request. Running `--check` twice locally is the same check without CI.

## Numbers

Two generator scripts, zero new things a human must supply to reproduce:
Pillow (pinned by the gate's pip call) and the bundled Inter font. Regeneration
is byte-identical across runs — that is what `--check` asserts.