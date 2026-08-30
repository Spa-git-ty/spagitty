<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-064 — Manual sweep

**Item:** [`agile/items/FEAT-064-diff-syntax-highlighting.md`](../items/FEAT-064-diff-syntax-highlighting.md)

## Sweep tickets

| Ticket | Preconditions | Steps | Expected result | Priority | Result |
| --- | --- | --- | --- | --- | --- |
| SWEEP-FEAT064-01 | A repository is open with modified Rust or TypeScript files | 1. Navigate to Working copy (1C) or Diff screen (1B)<br>2. Select a `.rs` or `.ts` file | Diff lines display syntax colorization for keywords, strings, types, and numbers while preserving addition/deletion background fills | P1 | Pass |
| SWEEP-FEAT064-02 | Diff view is open | 1. Toggle between `unified` and `split` view modes | Both split columns render syntax highlighted code lines cleanly aligned with line numbers | P1 | Pass |
| SWEEP-FEAT064-03 | Diff view is open | 1. Open Settings (1K)<br>2. Switch between Catppuccin, Dracula, Tokyo Night, and Gruvbox themes | Syntax tokens adapt their foreground colors according to the active theme palette | P2 | Pass |
| SWEEP-FEAT064-04 | File history view is open (`/history`) | 1. Inspect a source file | Code lines in the blame view display matching syntax highlighting | P2 | Pass |
| SWEEP-FEAT064-05 | Diff view is open with an unsupported extension (e.g. `.log`, `.txt`) | 1. Select the file | Text renders cleanly as plain code without errors or malformed spans | P2 | Pass |
