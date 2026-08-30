<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-063 — File history and blame view

**Status:** Backlog
**Screens:** Log search (1I), Diff screen (1B), new File History rail item.
**Raised by:** gap analysis in `docs/analysis/gitkraken-gap.md`.

## Problem

Understanding how a single file evolved requires running manual log filters or
switching to the terminal for `git blame` and `git log -p -- <file>`. Spagitty
currently has path filtering in Log search, but lacks an interactive, line-by-line
blame gutter integrated into file viewing, making authorship discovery and regression
tracking cumbersome.

## Change

- **Core blame and file history engine:**
  - `history::file_commits(repo_path, file_path, limit)` streaming commit records touching a path (following renames via `--follow`).
  - `history::blame(repo_path, file_path, commit_hash)` returning hunk-level blame metadata (commit SHA, author name, timestamp, line ranges).
- **Interactive Blame and History View:**
  - Gutter alongside the file diff / content showing author portrait, commit summary, date, and short hash.
  - Hovering a blame block highlights all lines originating from the same commit.
  - Clicking a blame entry jumps to that commit on the Graph (1A) or opens the full commit diff.
  - Timeline slider to inspect the file's content at any historic commit.

## Non-scope

- Live editable buffer in the history view (view remains read-only).
- Blame tracking through external submodules.

## Acceptance criteria

- `git blame` parsing handles renames, whitespace ignores, and boundary commits.
- Gutter rendering virtualizes smoothly for large files (>5,000 lines).
- Clicking a commit chip navigates directly to the Graph view with that commit selected.
- All tests pass and `tools/record.test.ts` passes.
