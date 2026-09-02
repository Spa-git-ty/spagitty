<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-066 — Diff content search

**Status:** Done.
**Screens:** Log search (1I).
**Raised by:** gap analysis in `docs/analysis/gitkraken-gap.md`.

## Problem

Log search (FEAT-007) allows searching commits by commit message, author name,
path, and date range, but cannot search within the actual diff contents or patch
lines. Developers frequently need to locate when a specific string, function
signature, or identifier was introduced or removed (`git log -G` / `git log -S` pickaxe).

## Change

- **Core diff search in `spagitty-core`:**
  - Support regex and literal patch search using `git log -G <regex>` and `git log -S <string>`.
  - Stream results incrementally with line numbers and matched hunk previews.
  - Support combining diff search with author, branch, and date filters.
- **Log search UI enhancements:**
  - Add a "Patch / Diff Content" query mode in Log search (1I).
  - Highlight matched strings within the expandable diff previews.
  - Display badge counts for added vs deleted matches per commit row.

## Non-scope

- Full-text indexing or persistent search database on disk (queries remain direct git reads).
- Modifying historical commits matching search results.

## Acceptance criteria

- `git log -G` regex queries and `-S` string pickaxe queries return matching commits accurately.
- Matched terms are highlighted inside the diff pane with proper jump-to-match affordances.
- Search execution can be cancelled mid-flight if the user modifies the query.
- `tools/record.test.ts` passes.
