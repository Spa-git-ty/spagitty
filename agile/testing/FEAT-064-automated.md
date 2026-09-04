<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-064 — Automated test record

**Item:** [`agile/items/FEAT-064-diff-syntax-highlighting.md`](../items/FEAT-064-diff-syntax-highlighting.md)

## What was tested

1. `src/lib/diff/highlight.test.ts`:
   - `detectLanguage`: asserts accurate language detection across Rust, TypeScript, JavaScript, Python, Go, C++, SQL, TOML, JSON, YAML, Shell, Svelte, Markdown, and plain text.
   - `escapeHtml`: verifies proper sanitization of `<`, `>`, `&`, `"`, and `'`.
   - `tokenize`: tests token classification for keywords, types, functions, numbers, strings, line comments, hash comments, operators, punctuation, and whitespace.
   - `highlightLine`: verifies HTML generation with `.tok-*` class wrapping.
2. `src/lib/diff/panes.test.ts`:
   - Unified and split diff rendering integration with syntax highlighting.
3. `tools/record.test.ts`:
   - Triplet record verification and agile index integrity.

## Test command & output

```
$ bun run test src/lib/diff/highlight.test.ts
✓ src/lib/diff/highlight.test.ts (8 tests)
Test Files  1 passed (1)
Tests  8 passed (8)

$ bun run test src/lib/diff/panes.test.ts
✓ src/lib/diff/panes.test.ts (17 tests)
Test Files  1 passed (1)
Tests  17 passed (17)
```
