<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-038 — Automated tests

**Item:** [`agile/items/FEAT-038-pull.md`](../items/FEAT-038-pull.md)
**File:** `src/lib/graph/actions.test.ts`, the `pull` block — 11 tests.

*Backfilled by TASK-013. Every test named here exists and passes.*

## Where the tests are, and why there

Pull's risk is not in the git invocation — that is three lines of argument
assembly — it is in what the app decides to do around it: what it asks, what it
does with uncommitted work, and what it leaves behind when a step fails. All of
that is `actions.ts`, tested against a stubbed `api`.

## The click, and the modes

| Test | Holds in place |
| --- | --- |
| `fast-forwards without asking, on a clean working copy` | the click is `--ff-only` and asks nothing, because nothing can go wrong |
| `marks a rebase pull as the destructive one` | rebase is flagged where merge is not |
| `pulls nothing when the confirmation is declined` | declining does nothing at all |

## Uncommitted work

| Test | Holds in place |
| --- | --- |
| `asks first, naming how many there are` | the confirmation counts the changes rather than saying "some" |
| `says "change" for one of them` | the singular |
| `stashes, pulls, then puts the changes back` | the order, on the happy path |
| `does none of it when declined` | no stash, no pull |
| `does not pull when the stash itself fails` | **nothing was touched, so nothing is pulled** |
| `leaves the changes in the stash when the pull fails` | the deliberate one: a half-finished pull must not have work restored on top of it |
| `distinguishes a failed restore from a failed pull` | two different situations, two different next steps, two different messages |
| `re-reads afterwards, whichever way it went` | the screen never shows a stale tree after a pull |

The three failure tests are the item. Everything else about pull can be redone;
those are the paths where work is lost.

## Also exercised

`perform — the shape every action shares` covers the reporting and re-read
wrapper that `pull` goes through, and `remotes` covers fetch and push beside it
(see FEAT-018's own documents).

## Coverage at the time

1055 frontend tests, all passing; `npm run check` clean over 991 files.

## Not covered here

- That `git pull --ff-only` actually refuses a diverged branch. That is git's
  behaviour, not the app's — `FEAT-038-T2` in the sweep.
- That the toolbar is optically centred, which is a measurement against a real
  layout — `FEAT-038-T5`.
- A pull that stops in a conflict. Merge and rebase modes can, and what the app
  shows then is the Conflicts screen's business — `FEAT-038-T3`.
