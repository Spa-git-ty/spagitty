<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-015 — Automated tests

**Item:** [`agile/items/TASK-015-document-drift.md`](../items/TASK-015-document-drift.md)

## What can be automated here, and what cannot

Prose is not testable. What *is* testable is whether the documents and the tree
still agree about identifiers, and `tools/record.test.ts` already does that: a
missing row, a row with no document, a status that disagrees with its item, or a
cited identifier that resolves to nothing.

```
$ npx vitest run tools/record.test.ts
Test Files  1 passed (1)
     Tests  324 passed (324)
```

That is the check that caught the drift this item's predecessors fixed
(TASK-012), and it is why the record has stayed true while the *prose* around it
did not. The gap is exactly the shape of this item: identifiers are checked,
sentences are not.

## Why no test asserts on the sentences

A test that pinned "Nothing in Spagitty talks to a network" would have failed
when FEAT-017 landed — and the person landing it would have updated the string,
because that is what a failing string assertion teaches people to do. It would
have recorded the change rather than questioned it.

The claims worth holding are held where they are made, by tests over the code:

| Claim | Held by |
| --- | --- |
| exactly one HTTP client, only in the core, only reachable from `forge/http.rs` | `requests.test.ts` and the crate's own test |
| reading conflicts never writes to the repository | `reading_every_side_never_writes_to_the_repository` in `conflicts.rs` |
| no host's name appears in the Pull requests screen | the test named in `docs/screens.md`'s 1H section |
| the record and the tree agree | `tools/record.test.ts` |

A document that describes those is checkable by reading it against them, which
is what the sweep does.

## The full suite

Run to prove a documentation change touched nothing else:

```
$ npx vitest run
Test Files  72 passed (72)
     Tests  1748 passed (1748)
```

Both counts move with this item rather than despite it: `tools/record.test.ts`
builds a case per document in `agile/`, so its own total went from 320 to 324
and the suite's from 1744 to 1748 when this item's four documents landed.

## Coverage

No source line changed. The Amendment 10 figure is unaffected.
