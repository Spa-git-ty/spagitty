<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-065 — Image and binary diffs

**Status:** Done.
**Screens:** Diff screen (1B), Working copy (1C), Stash (1G), Pull requests (1H).
**Raised by:** gap analysis in `docs/analysis/gitkraken-gap.md`.

## Problem

When binary files or image assets (PNG, JPEG, SVG, WebP, GIF, ICO) are modified,
Spagitty currently displays a plain "Binary file changed" message without visual
inspection tools, forcing users to open external image viewers to inspect visual assets.

## Change

- **Visual image diff modes:**
  - **Side-by-side (2-up):** Old and new images rendered side by side with dimension and file size indicators.
  - **Swipe / Split slider:** Interactive horizontal divider slider that wipes across old and new versions over a shared canvas.
  - **Onion skin:** Opacity blend slider fading between old and new layers.
  - **Difference heat map:** Visual inverted blend mode showing exact pixel changes.
- **Binary metadata diffs:**
  - Display file size changes (delta bytes), MIME type, and checksum differences for non-image binary files (ZIP, PDF, WASM, audio, video).
- **Backend asset loading:**
  - Secure Tauri IPC protocol to stream blob data for old/new revisions from git object store without writing temporary files to disk.

## Non-scope

- Interactive image editing or layer compositing.
- 3D model or audio waveform visualizers.

## Acceptance criteria

- Common image formats (PNG, JPG, SVG, WebP, GIF) load correctly from index and git commits.
- Swipe and onion skin sliders respond smoothly with zero layout distortion.
- Dimension drift (e.g. 200×200 -> 300×200) and byte size delta are clearly badged.
- `tools/record.test.ts` passes.
