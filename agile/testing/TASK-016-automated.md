<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-016 — Automated tests

**Item:** [`agile/items/TASK-016-one-branch-carried-fifteen-items.md`](../items/TASK-016-one-branch-carried-fifteen-items.md)

## What runs

`tools/record.test.ts`, in the ordinary suite. For this item it proves three
things:

- Every identifier in the mapping table resolves to an item document. A table
  citing an item that does not exist would fail the run — which is how the
  identifier spent in a source comment was found in the first place, when it
  did *not* fail because source comments are not read.
- The index and the tree agree about TASK-016 itself: a row, four documents, and
  a status word matching the item's.
- No status in the index disagrees with its item, which is what would happen if
  the table had quietly relabelled anything.

```
$ npx vitest run tools/record.test.ts
Test Files  1 passed (1)
     Tests  324 passed (324)
```

## What cannot be automated, and why

Whether a row is *correct* — whether FEAT-050 really landed in `fd0c68e` — is
not something the suite can check, because nothing in the repository declares
where an item landed except this table. A test would have to parse commit
subjects for identifiers and compare, which:

- fails for the three commits that carry two items,
- fails for the commit whose second item is named only in a code comment,
- and fails for the four commits that name no item at all —

which is to say it fails on precisely the cases the table exists to record. A
check that works only where nothing went wrong is not a check.

The sweep does it by hand instead, and re-derives a sample from `git log` rather
than re-reading the table.

## A note for whoever writes the next record item

`tools/record.test.ts` reads `agile/` and `docs/`. It does not read `src/`,
`crates/` or commit messages. An identifier can be spent in any of those without
the record noticing — which has now happened twice. Widening it is a real item
and would have caught both.

## Coverage

No first-party source line changed. The Amendment 10 figure is unaffected.
