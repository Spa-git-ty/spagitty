<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-064 — Diff syntax highlighting

**Status:** Done.
**Screens:** Diff screen (1B), Working copy (1C), Stash (1G), Pull requests (1H).
**Raised by:** gap analysis in `docs/analysis/gitkraken-gap.md`.

## Problem

Diff hunks across all screens render as plain monochrome text over green and red
background fills. Without code syntax highlighting, scanning complex diffs in
languages like Rust, TypeScript, Python, and JSON is visually fatiguing and slows down
code reviews and merge resolution.

## Change

- **Syntax tokenizer:**
  - Introduce an efficient client-side syntax highlighter (using Tree-sitter, Prism, or Shiki engine with scoped language grammars).
  - Support automatic language detection based on file extension and shebang header.
- **Theme integration:**
  - Token classes map to Spagitty's semantic CSS design tokens (`--fg`, `--accent`, `--dim`, `--syntax-*`) across dark, glass, and light modes.
  - Diff additions and deletions retain their diff background tints while applying foreground syntax styling to the code tokens.
- **Performance & virtualization:**
  - Tokenization runs in Web Workers or asynchronously per visible hunk window to prevent freezing the UI on multi-thousand line diffs.
  - Fallback to plain text for unsupported formats or minified/very long lines (>2,000 characters).

## Non-scope

- Full language server protocol (LSP) features (e.g. go-to-definition in diffs).
- Rich rich-text WYSIWYG editing.

## Acceptance criteria

- Common programming languages (Rust, JS/TS, Python, Go, HTML, CSS, JSON, Markdown, YAML) highlight correctly.
- Additions and deletions maintain high contrast and accessibility across all themes.
- Scrolling a large diff does not drop frame rates below 60fps.
- `tools/record.test.ts` passes.
