<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-060 — Automated tests

**Item:** [`agile/items/FEAT-060-spagitty-brand.md`](../items/FEAT-060-spagitty-brand.md)

## What was tested

The brand work is deterministic generation, so the automated proof is: does
the committed tree still match the generators, and is the geometry sane?

| Command | Result |
| --- | --- |
| `python3 tools/make-icons.py` then `… --check` | regenerates clean; `--check` reports **icon set matches the committed sources** |
| `python3 tools/make-brand.py` then `… --check` | regenerates clean; `--check` reports **brand collateral matches the committed sources** |
| PNG/alpha geom: `icon.png` | 512², full-frame plate (alpha 0–255), strands+tangle+node rows in frame |
| Bare mark (`brand-mark.png` / `-light`) | 512² transparent frame; content bbox `(75,0)-(444,473)` — tangle clipped at the top edge as designed, nodes at the bottom |
| `monogram.png` | 512², bbox `(59,7)-(453,505)` — the S fills the frame |
| `hero.png` | 1600×400, plate full-frame, faint lane columns present (alpha floor 32) |
| `lockup-ink-light.png` | 1253×660, mark + wordmark in one row (`bbox (128,44)-(1184,572)`) |
| `menubar-mono.png` | 18×18 from a 36² mono render, alpha-only shape |
| SVG sources (`mark.svg`, `lockup.svg`) | deterministic byte-output, geometry matches the raster maths |

The suite itself does not import the generators; instead the gate-2 drift step
(`pip install pillow`, both `--check` flags) is the perpetual regression test —
a future bump of the geometry that is not committed to the tree fails the pull
request. Running `--check` twice locally is the same check without CI.

## Numbers

Two generator scripts, zero new things a human must supply to reproduce:
Pillow (pinned by the gate's pip call) and the bundled Inter font. Regeneration
is byte-identical across runs — that is what `--check` asserts.