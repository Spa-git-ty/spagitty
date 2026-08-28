<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-007 — Log search (1I)

**Status:** Done.
**Branch:** `feature/FEAT-007-log-search`.
**Route:** `/search`. **Rail:** "Log", hint `⌘F`.

## Problem

The nav rail's filter field and the `⌘F` hint both point at a placeholder. There
is no way to find a commit by author, path, message or date, and no way to see
who last touched a line.

## Motivation

"Who changed this, and when, and why" is the question that sends people to
`git log -S` and `git blame`, and it is the one where a GUI's ability to show
results and their context side by side actually beats the terminal.

## Scope

- A query field with removable filter chips: `author:`, `path:`, `message:`, and
  a date range.
- Results rendered as graph-style rows, reusing the Graph screen's row
  components so a result looks like what it is.
- A side column for file, person and branch lookups.
- A blame strip for a chosen file.
- `↵` opens the commit, `⌥↵` opens its diff.

## Non-scope

- Full-text search of file contents at every revision (`git log -S` pickaxe
  semantics over blobs). Path and message filters only.
- Regular expressions in the first pass.
- Searching across repositories.
- Editing anything.

## Acceptance criteria

1. Each filter alone returns what the matching `git log` invocation returns —
   `--author`, `--`, `--grep`, `--since`/`--until` — in the same order.
2. Filters compose as AND, and the chips show exactly what is applied.
3. Results stream like the graph does rather than blocking until the walk ends,
   and a superseded query's results never appear.
4. An empty result says so and says which filter is narrowest.
5. Blame output for a file matches `git blame` line for line at the same
   revision.
6. Blame on a binary or missing file says so rather than rendering empty.
7. `⌘F` from any screen lands here with focus in the query field.
8. `↵` and `⌥↵` do what the footer says.

## Dependencies

FEAT-001 (`graph::walk`, row components), FEAT-002 (opening a diff).
