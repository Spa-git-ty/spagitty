<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-018 — Automated tests

**Item:** [`agile/items/FEAT-018-fetch-and-push.md`](../items/FEAT-018-fetch-and-push.md)
**File:** `src/lib/graph/actions.test.ts`, the `remotes` block — 3 tests.

*Backfilled by TASK-013. This document records the tests that exist, including
where they are thinner than the item deserves.*

## Tests

| Test | Holds in place |
| --- | --- |
| `fetches without asking — nothing is lost by fetching` | fetch is a single click with no confirmation, and the comment says why |
| `pushes without asking` | the same for push, which is safe because no interface offers a force |
| `reports a rejected push` | git's own rejection becomes a sentence, and the app does not re-read after a failure |

`perform — the shape every action shares` covers the wrapper both go through:
report on success and re-read, report on failure and do not, and never throw out
to a menu entry that has nowhere to catch.

The command log's tests use a real fetch invocation as their fixture —
`git fetch --prune --progress --all` in `CommandLog.test.ts` — so the arguments
this item sends are pinned there, incidentally but genuinely.

## The gap this document must not hide

The first test's name says *nothing is lost by fetching*. That is true of the
working copy and false of remote-tracking refs, because `--prune` is
unconditional (see the plan). **No test asserts the prune, and none asserts that
a user was asked about it, because neither happens.** When pruning becomes a
choice, that test's name is the one to revisit.

There is also no test for a push with no upstream, which is the case a person
meets on every new branch. It fails with git's message, and nothing pins that
behaviour.

## Coverage at the time

Covered incidentally by the suites that ran at each landing: 1055 frontend tests
at `b71f8aa`, all four metrics over the floor.

## Not covered here

- Anything touching a network. No test fetches or pushes for real; the sweep
  does that against a scratch remote.
- Credential failure. `GIT_TERMINAL_PROMPT=0` is what turns a hang into an
  error, and it is asserted nowhere — `FEAT-018-T4` in the sweep.
