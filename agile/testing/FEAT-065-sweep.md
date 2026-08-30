<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-065 — Manual sweep

**Item:** [`agile/items/FEAT-065-image-and-binary-diffs.md`](../items/FEAT-065-image-and-binary-diffs.md)

## Sweep tickets

| Ticket | Preconditions | Steps | Expected result | Priority | Result |
| --- | --- | --- | --- | --- | --- |
| SWEEP-FEAT065-01 | A repository is open with modified PNG/JPEG/SVG assets | 1. Select the image in Diff view (1B) or Working copy (1C) | Image diff view opens with 2-up mode showing before and after frames and file size stats | P1 | Pass |
| SWEEP-FEAT065-02 | Image diff view is open | 1. Click `Swipe` mode tab<br>2. Drag the divider slider left and right | Canvas reveals old and new image layers beneath the divider handle smoothly | P1 | Pass |
| SWEEP-FEAT065-03 | Image diff view is open | 1. Click `Onion Skin` mode tab<br>2. Drag opacity slider from 0% to 100% | Top image layer fades opacity smoothly over the bottom revision | P1 | Pass |
| SWEEP-FEAT065-04 | A non-image binary file (e.g. `.zip`, `.wasm`, `.pdf`) is modified | 1. Select the binary file in the diff view | Binary metadata card opens showing previous size, new size, delta bytes badge, and MIME type | P1 | Pass |
| SWEEP-FEAT065-05 | A transparent PNG is selected in image diff view | 1. Inspect image background | Transparent regions display alpha checkerboard background pattern | P2 | Pass |
