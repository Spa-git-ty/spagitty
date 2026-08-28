<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-022 — Automated tests

## Run result

```
npm test                   760 passed, 0 failed   (43 files)
npm run check              0 errors, 0 warnings
cargo test --workspace     257 passed, 0 failed
```

Up from 714 at FEAT-021: 46 frontend tests across three new files and the
retuned geometry.

## Coverage against the Amendment 10 floor of 70%

| Tree | Statements | Branches | Functions | Lines |
| --- | --- | --- | --- | --- |
| Frontend, all first-party | 79.12% | 63.00% | 74.98% | 78.64% |
| `src/lib/**` (stores and pure logic) | 84.59% | 78.26% | 69.23% | 84.88% |
| `src/lib/graph/highlight.ts` | 94.87% | 88.23% | 100.00% | 100.00% |
| `src/lib/graph/avatar.ts` | 100.00% | 100.00% | 100.00% | 100.00% |
| `src/lib/palette/commands.ts` | 67.74% | 60.00% | 62.96% | 66.66% |

Above the floor. Where it is thin, it is thin deliberately:

- **`actions.ts` (2.8%)** is a wrapper per git verb: ask through `dialog`, call
  one `api` function, report through `notice`. Testing it asserts that a mock
  was called with the arguments it was handed, which is padding under Amendment
  10 rather than coverage. What can actually be wrong there — the operations
  themselves — is tested in Rust, where `ops.rs` runs against real repositories.
- **`.svelte` components** are covered through their stores. The components are
  markup over state that is tested directly.
- **`commands.ts`'s uncovered lines** are the `run` bodies that delegate to
  `visibility` and to the two network verbs; the registration shape, the
  enable/disable reasons, and the ranking are all asserted.

## `highlight.test.ts`, 24 tests

The hover logic, and the file with the most ways to be quietly wrong. Every
test runs against one five-row history with a merged topic branch, written out
at the top of the file so the expected answers can be read off it.

- **`ancestry`** — includes the tip; follows *both* sides of a merge; excludes
  non-ancestors; never looks above the tip; empty for an unwalked row; stops at
  `count` rather than inventing rows; skips gaps in a partly-delivered walk.
- **`ghostPath`** — nothing from a commit that already has a label; runs from a
  bare commit to the nearest labelled row; takes the *shortest* route when two
  labels can reach it, which is the breadth-first guarantee; returns the trail
  commit-first and reference-last; empty when nothing descends from it, when the
  row is unwalked, and when every descendant is also unlabelled.
- **`rowOfRef`** — finds a branch's row; null for an unwalked ref; matches the
  whole name rather than a prefix; does not look past what is loaded.
- **`byAuthor`** — null for no filter, which means "dim nothing"; substring and
  case-insensitive matching; an **empty set** rather than null when a real
  filter matches nothing, because the two must not render the same; honours the
  range it was given; skips undelivered rows.

## `avatar.test.ts`, 11 tests

- **`initials`** — first and last word; one letter for a one-word name rather
  than an invented second; splits on `.`, `_` and `-`; uses the local part of a
  bare email address but keeps a real name carrying an address; falls back to
  `?` on a name with no letters; correct for Arabic and CJK names, which is what
  the code-point-aware split is there for.
- **`avatarColor`** — stable for a name; case- and space-insensitive, since git
  does not normalise either; only ever names a lane colour the theme defines;
  spreads names differing only at the end across buckets.

## `commands.test.ts`, 11 tests

`$app/navigation` is mocked; the registry is cleared before each test.

Unique ids; idempotent registration; every command grouped; navigation calls
`goto` with the right path; repository commands disabled with the reason
`No repository open` while navigation stays enabled; a column toggles and
toggles back; the author-filter command offers itself only when a filter is
set; zoom and text size move and both reset together; a command is found by its
initials, and the shorter title wins a tie.

## `metrics.test.ts`, retuned

Two assertions changed with the lane geometry and one was added:

- The five-lane column is 96px, not 150px — lanes at 12…72, `r = 5.5`, 18px of
  slack.
- `laneColumnWidth` returns whole pixels at every lane count and zoom tested,
  because a half-pixel column puts the canvas and the row cells on different
  device-pixel boundaries.

Everything else in the file asserts through the constants rather than against
literals, so the retune did not require rewriting the suite — which is what
made it safe to do.
