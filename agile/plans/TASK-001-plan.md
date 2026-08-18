<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-001 — Plan

## Approach

Documentation only, in one pass, in this order:

1. `agile/README.md` — the conventions this directory follows and the index,
   written first so the rest has a shape to fit.
2. FEAT-001 and FEAT-002 quadruplets, each headed by a note that it was written
   retroactively and reconstructed from the code.
3. This item's own quadruplet.
4. Item documents for TASK-002 and FEAT-003 to FEAT-012 — the "what and why"
   only, since their plans belong to their own branches.
5. Backlog item documents FEAT-013 to FEAT-018 for the destructive operations
   deferred by the author's decision.
6. `docs/architecture.md`, `docs/screens.md`, `docs/testing.md`.

## Decisions

**Retroactive documents are labelled, not disguised.** A reconstruction that
presents itself as a contemporaneous record is worse than no record, because it
invites trust it has not earned. Both backfilled items carry a header saying
when and why they were written.

**Plans are not written ahead of their work.** Amendment 12's triplet rule binds
at implementation, not at the moment an idea is recorded. Writing ten plans now
would produce ten guesses that the implementation immediately contradicts, and
Amendment 11 would then class them as stale.

**The branch stack is recorded, not hidden.** With no remote, no pull request
can be opened, so nothing can legitimately reach `dev`. Branches therefore stack
— each item cut from the previous — and `docs/architecture.md` says so, along
with the order they merge in once a remote exists.

## Files

- `agile/README.md`
- `agile/items/*.md`, `agile/plans/*.md`, `agile/testing/*.md`
- `docs/architecture.md`, `docs/screens.md`, `docs/testing.md`

## Risks

- **Staleness.** These documents describe code that is about to change under
  them. Mitigated by `docs/screens.md` being updated by each screen's own item
  as part of that item's change, rather than in a sweep at the end.

## Rollback

Revert the commit. Nothing depends on it at build time.
