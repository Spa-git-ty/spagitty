<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-040 — The graph's footer says what is true, not what to do

**Status:** Backlog. No plan yet; one is written when the work starts.
**Screen:** Graph (1A).
**Requested by:** the author, 2026-08-18. Recorded as an item on the same day,
per Amendment 11 — a decision written down later is a reconstruction.

## Problem

The graph's footer carries two hint lines that tell the user how to operate the
screen they are already operating. TASK-007 and TASK-009 removed that kind of
copy everywhere else — the interface stopped narrating itself and stopped naming
its own work items — and this footer is what is left of it.

It also has the space to answer three questions people actually ask while
looking at a graph, and answers none of them.

## Wanted

The hints go. In their place, three facts:

- **How many files are changed** in the working copy right now.
- **When the graph last refreshed** — the walk, not the process.
- **Whether a fetch has happened, and when.** The whole graph is as old as the
  last fetch, and nothing in the application says so today.

## Known before starting

The last-fetch answer does not exist anywhere yet: there is no `lastFetched` on
`Snapshot`, `RepoInfo` or `RepoCounts`. The cheapest true source is the mtime of
`.git/FETCH_HEAD`, which git writes on every fetch — so this needs a new Rust
read, not just a frontend change. A repository that has never been fetched has
no `FETCH_HEAD` at all, and "never" is a real answer that has to be sayable.

## Non-scope

- Fetching anything to make the number fresher. This is reporting.
- The application-wide status strip along the bottom of the window (FEAT-043),
  which is a different row with a different job.

## Acceptance criteria

- No line in the graph's footer tells the user how to use the graph.
- The changed-file count matches the Working copy screen's own count, always.
- The refresh time updates when the walk re-runs, not when the process started.
- A repository that has never been fetched says so rather than showing an empty
  or invented time.

## Dependencies

None hard. FEAT-018's fetch is what makes the last-fetch line move.
