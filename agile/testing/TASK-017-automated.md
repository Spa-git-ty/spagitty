<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-017 — Automated tests

**Item:** [`agile/items/TASK-017-flow-restore.md`](../items/TASK-017-flow-restore.md)

## There is no new test, and here is why

This item writes no source line. It pushes branches, merges branches and opens a
pull request. There is nothing to unit-test, and a test that asserted "the
remote has a `dev`" would be asserting on somebody else's server from a runner
that has no business knowing.

What it can be wrong about is the **merged tree**, and that is where the
existing suite earns its place: nine branches were each verified alone and none
of them was ever verified together.

## The suite is the integration test here

Run on the merged tree, before the pull request is opened:

```
$ npx vitest run
$ npm run check
$ npm run coverage
$ cargo test --workspace
```

| Check | What it proves about the merge specifically |
| --- | --- |
| `tools/record.test.ts` | the index rows from nine branches survived the conflict resolution, no identifier is listed twice, every status still matches its item, and every citation resolves — including the ones written in prose on the branches because they could not resolve there |
| the Conflicts screen's own tests | the one real content conflict, where a restyle and a footer removal met in the same file, was resolved into a screen that still behaves |
| `npm run check` | nothing was left half-merged: an import that survived without its symbol, or a symbol without its import, is a type error |
| `npm run coverage` | the floor is met by the combination, not just by each branch |
| `cargo test --workspace` | the one Rust change in the stack is intact after the merge |

## Recorded run

On the merged tree, `task/TASK-017-flow-restore`, after nine branches were
merged into it and before the pull request was opened.

```
$ npx vitest run
Test Files  75 passed (75)
     Tests  1838 passed (1838)

$ npm run check
1039 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS

$ cargo test --workspace
test result: ok. 68 passed; 0 failed
test result: ok. 445 passed; 0 failed

$ npm run coverage
Statements   : 85.98% ( 6211/7223 )
Branches     : 74.58% ( 2031/2723 )
Functions    : 82.19% ( 1620/1971 )
Lines        : 85.70% ( 4370/5099 )
```

The numbers are the point of the exercise rather than decoration. Each branch
was verified alone and each was lower: 1748 tests on the documents-only
branches, 1789 on the glass, 1757 on the resume refactor. 1838 is the
combination, and it is the first time the nine have ever been in one tree.

The same run on the runner, on the pull request, agreed exactly — 1838 tests,
85.98% statements — which is the useful thing to know about a merge nobody had
tried before.

## Coverage — Amendment 10

No first-party source line changes in this item, so the figure is whatever the
merged tree produces. It is recorded above rather than asserted here, because
the merge can only lower it by losing somebody else's test in a conflict — which
is a thing the number would show.

## What is not tested here, and why

That the pull request runs. Whether the gates fire, and what they say when they
do, is the first-CI-run item's whole subject and is deliberately not claimed by
this one. This item ends when there is a path for them to run on.
