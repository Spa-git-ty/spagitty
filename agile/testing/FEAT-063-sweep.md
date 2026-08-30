<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-063 — Manual sweep

**Item:** [`agile/items/FEAT-063-file-history-and-blame.md`](../items/FEAT-063-file-history-and-blame.md)

## Sweep tickets

| Ticket | Preconditions | Steps | Expected result | Priority | Result |
| --- | --- | --- | --- | --- | --- |
| SWEEP-FEAT063-01 | A repository is open | 1. Open Command Palette (Ctrl+P / ⌘P)<br>2. Select `Go to File history`<br>3. Enter a valid tracked file path (e.g. `README.md`) | File history view opens displaying commit timeline on the left and blame gutter on the right | P1 | Pass |
| SWEEP-FEAT063-02 | File history view is open | 1. Hover over a commit card in the timeline | All lines in the blame gutter originating from that commit are highlighted | P1 | Pass |
| SWEEP-FEAT063-03 | File history view is open | 1. Hover over a line in the blame gutter | The corresponding commit in the left timeline is highlighted | P1 | Pass |
| SWEEP-FEAT063-04 | File history view is open | 1. Click `View on Graph →` on any commit in the timeline | Spagitty navigates to the Graph view (1A) with that commit selected | P1 | Pass |
| SWEEP-FEAT063-05 | File history view is open | 1. Click the copy icon next to the file path in the header | File path is copied to clipboard and confirmation notice appears | P2 | Pass |
