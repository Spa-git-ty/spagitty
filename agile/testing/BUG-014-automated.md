<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-014 — Automated tests

**Item:** [`agile/items/BUG-014-conflicts-footer-says-resolving-is-not-built.md`](../items/BUG-014-conflicts-footer-says-resolving-is-not-built.md)

## No new test, and the reason is the finding

Nothing was added; a footer and its two supporting declarations were removed.

The part worth recording is that **no existing test read that sentence**. Had
one asserted the footer's text, it would have gone red the day FEAT-016 landed
the writes, and the screen would never have shipped a paragraph contradicting
itself. It did not, so the sentence survived a full feature that made it false.

That is not an argument for asserting on copy everywhere — a test that pins
every string fails on every legitimate edit and teaches people to update tests
without reading them. It is an argument for the sweep, and for the record test
that already catches the same class of drift in `agile/` and `docs/`.

## What the suite proves here

That the removal took nothing with it:

```
$ npx vitest run
Test Files  72 passed (72)
     Tests  1748 passed (1748)

$ npm run check
1033 FILES 0 ERRORS 0 WARNINGS
```

1744 of those are the tree before this item; the other four come from
`tools/record.test.ts`, which builds a case per document in `agile/` and gained
one for each of this item's four.

The type check is the useful half: `escapeHatch` and `.foot` were removed along
with their only reader, and an orphan of either would have been reported.

## What still holds the claim that survived

`reading_every_side_never_writes_to_the_repository`, in
`crates/spagitty-core/src/conflicts.rs`. It takes the index's modification time
either side of visiting every conflicted file, and fails if a status walk
rewrote it or left `.git/index.lock` behind. The corrected documentation now
claims exactly what that test proves and nothing wider.

## Coverage

No first-party line was added. `src/routes/**` is outside the coverage scope in
either direction, so the Amendment 10 figure is unchanged.
