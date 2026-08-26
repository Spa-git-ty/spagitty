<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-013 — Automated tests

**Item:** [`agile/items/BUG-013-tab-strip-with-no-repository.md`](../items/BUG-013-tab-strip-with-no-repository.md)

*Backfilled with the item, after the identifier was found spent in a source
comment with no record behind it.*

## There are none, and that is the finding

The fix is a sequence inside `onMount` in `src/routes/+layout.svelte`. No test
in this repository covers it, and none was added with it.

`src/routes/**` is excluded from the coverage scope on purpose — those files are
the screens' shells, and their logic is supposed to live in `src/lib`. The
exclusion is right; what it exposed here is that this particular piece of logic
does not live in `src/lib` and should.

## What the stores already hold

The pieces the fix calls are covered where they are:

- `workspace.active` and `workspace.placeOf` — `src/lib/workspace.test.ts`,
  including a strip restored from storage.
- `graph.want` across a walk — `src/lib/graph/store.test.ts`.
- `repo.open` and the error left behind by a path that does not resolve —
  `src/lib/repo.test.ts`.

Every part is tested. What is untested is the order they are called in, which is
the entire bug: nothing was broken, one call was missing.

## What would make it testable

Lift the sequence out of the shell into `src/lib` — a `resumeSession()` that
takes the launch path and the workspace and returns what to open, what to
navigate to and what to select. Then the order is a pure decision with a table
of cases: a launch path present, an active tab, both, neither, and a path that
fails to open.

That is a small refactor and it is deliberately **not** done inside this
document. It changes shipped behaviour's structure to serve a test, which is its
own item under Amendment 13, not a rider on a backfilled record.

## Until then

The sweep is the test, and its first ticket is the command-line path, because
that is the one behaviour the fix could have taken away.

## Coverage

No first-party line in `src/lib` changed, so the Amendment 10 figure is
unaffected by the fix or by this record.
