<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-064 — Implementation plan

**Item:** [`agile/items/FEAT-064-diff-syntax-highlighting.md`](../items/FEAT-064-diff-syntax-highlighting.md)

## Approach

Implement a client-side, zero-dependency, non-blocking syntax highlighter for diffs
and file previews. Language detection is performed from path file extensions, while
a fast regex/scanner tokenizes lines into keywords, strings, numbers, comments,
functions, types, operators, and punctuation. Tokens map to semantic CSS custom
properties that adapt across all Spagitty theme palettes (Catppuccin, Dracula,
Tokyo Night, Gruvbox) without altering diff addition/deletion row backgrounds.

## Touched files

- `src/lib/diff/highlight.ts`
- `src/lib/diff/highlight.test.ts`
- `src/lib/diff/DiffPane.svelte`
- `src/lib/history/FileHistoryView.svelte`
- `src/app.css`
- `agile/items/FEAT-064-diff-syntax-highlighting.md`
- `agile/plans/FEAT-064-plan.md`
- `agile/testing/FEAT-064-automated.md`
- `agile/testing/FEAT-064-sweep.md`

## Steps

1. Create `src/lib/diff/highlight.ts` supporting language detection, HTML escaping, and tokenization.
2. Add comprehensive unit tests in `src/lib/diff/highlight.test.ts`.
3. Add theme-adaptive token CSS rules in `src/app.css`.
4. Integrate syntax token rendering into `src/lib/diff/DiffPane.svelte` and `src/lib/history/FileHistoryView.svelte`.
5. Verify test coverage and absence of regressions across unified and split diff views.
