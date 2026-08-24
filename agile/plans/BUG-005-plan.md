<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-005 — Plan

## Decisions

**Fix forward on a branch, into a pull request.** The two offending commits are
pushed to `main`. Rewriting them would be a force-push to a protected branch —
forbidden twice over by Amendments 6 and 14 — and would erase the record of how
the work arrived. So: a `bugfix/` branch off `main`, three commits, one PR into
`main`, merged by the author.

**Assert the constants, don't restate them.** Every assertion in
`metrics.test.ts` that was written in terms of `LANE_PITCH` or `ROW_PITCH`
survived the geometry change untouched. The one written as a bare `129` is the
one that broke. The fix restores that property: the literal becomes 149 and the
comment beside it carries the arithmetic — `16 + 4×26 + 11 + 18` — so the next
reader can check it rather than trust it. The literal is kept deliberately: a
test that recomputes the formula asserts nothing, since it would pass whatever
the formula produced.

**Make the mirror real.** Two doc comments have claimed for the project's whole
life that a `metrics_match` test holds the Rust and TypeScript `ROW_PITCH`
together. It never existed, and this item is what happens when it does not. The
options were to correct the comment or to build what it promised; building it is
a dozen lines and turns a class of silent drift into a failing gate.

The test lives in Rust rather than in vitest, because Rust is the side that can
read the other's source without a build step: `graph.rs` opens
`src/lib/metrics.ts` relative to `CARGO_MANIFEST_DIR`, finds the
`export const ROW_PITCH = ` line, parses the number, and asserts equality. It
fails with both values named, so the message says which side moved.

**Restore the line-height rather than re-deriving it.** `--lh-ui: 1.35` is still
defined and still used by `MessageBox.svelte`; the declaration on `body` simply
went missing. One line back where it was.

**Backfill the records from the diff, not from memory.** TASK-004 and FEAT-029
are reconstructed by reading `994dbe9` — every claim in those documents is
checkable against that commit. They are marked as backfilled so nobody mistakes
them for documents written alongside the work.

**Commit the design bundle; ignore the IDE.** `design_handoff_gitlord/` is an
authored design source — the approved shell and wireframes the whole UI was
built from — and has been untracked since the beginning. `.idea/` is
machine-local project state, and one of its files had been staged by accident;
it is unstaged (index only, nothing on disk touched) and added to `.gitignore`.

## Files

| File | Change |
| --- | --- |
| `src/lib/metrics.test.ts` | Expectation 129 → 149; comment carries the arithmetic |
| `src/lib/metrics.ts` | Eight stale doc comments corrected, including the `LANE_COLUMNS_MAX` width table and its rationale |
| `src/app.css` | `line-height: var(--lh-ui)` restored on `body` |
| `crates/spagitty-core/src/graph.rs` | `ROW_PITCH` doc comment corrected; `row_pitch_matches_the_frontend` added |
| `docs/screens.md` | Graph geometry paragraph corrected |
| `.gitignore` | `.idea/` |
| `agile/items,plans,testing/` | TASK-004, FEAT-029, BUG-005 documents; TASK-005 item |
| `design_handoff_gitlord/` | Tracked for the first time |

## Ordered steps

1. Unstage `.idea/.gitignore`; cut `bugfix/BUG-005-metrics-drift` from `main`.
2. Code and docs: test expectation, comments, `line-height`, the mirror test.
3. Run every gate. Commit.
4. Write the `agile/` triplets. Commit.
5. `.gitignore` plus the design bundle. Commit.
6. Push the branch; open a PR into `main`. Stop — merging is the author's, and a
   merge to `main` publishes a release under Amendment 15.

## Risk

- **The mirror test reads a path outside the crate.** If `crates/spagitty-core`
  is ever vendored or published standalone, `../../src/lib/metrics.ts` is not
  there and the test fails on a missing file rather than on a real drift. The
  crate is a workspace member of an application, never published; if that ever
  changes, the test becomes a build-script check or moves to the app crate.
- **Parsing a TypeScript declaration with string matching** is brittle against
  reformatting — a `ROW_PITCH` split across lines, or given a computed value,
  would fail the `expect` in the parser rather than the assertion. It fails
  loudly and points at the file, which is the right failure mode for a
  twelve-line guard; a TypeScript parser in a Rust test would cost more than the
  problem.
- **Commenting geometry re-invites drift.** Mitigated by keeping the derivations
  as relationships (`2 × NODE_R + LANE_STROKE`) rather than as restated results
  wherever the prose allows it.

## Rollback

Each commit is independent. Reverting the first restores the red suite and the
false comments; reverting the second removes the records; reverting the third
untracks the design bundle. Nothing here changes application behaviour except
the one restored `line-height`.
