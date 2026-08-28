<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-051 — Tags list

**Status:** Done on `feature/FEAT-051-tags`.
**Screen:** Tags (1N).
**Requested by:** the gap analysis
[`docs/analysis/gitkraken-gap.md`](../../docs/analysis/gitkraken-gap.md),
2026-08-24: "create/delete exist via the graph's context menu only; there is no
tags list, no annotated-tag message editing, no checkout-from-tag affordance
gathered in one place."

## Why this identifier

FEAT-050 was the last one handed out. This is the next.

## Problem

Tags could be created and deleted from the graph's context menu, which means
either could only be done while already looking at the commit it was about. That
is backwards for the question people have about tags, which is *what versions
are there* — a question the graph answers only by scrolling until chips appear.

An annotated tag's message had nowhere to be read at all. The rail has counted
tags since FEAT-001 and clicking that count went nowhere.

## Wanted

- Every tag in one list, with what it points at and what it says.
- Annotated and lightweight told apart, because only one can carry a message.
- Create at any commit, annotated or not.
- Delete, edit an annotated message, and check a tag out.
- A filter over name, message and the tagged commit's subject.

## Non-scope

- **Pushing or deleting a tag on a remote.** `git push --tags` and
  `git push --delete` are network operations and belong with FEAT-018.
- **Signed tags.** Verification is FEAT-019's territory, and a screen that
  showed a signature it could not verify would be worse than one that shows
  none.
- **Sorting by version.** Newest first; see the plan for why.

## Acceptance criteria

- The list matches `git tag`, with annotated and lightweight distinguished.
- An annotated tag's target is the commit, not the tag object.
- Rewriting a message keeps the tag on the same commit.
- Rewriting with an empty message is refused rather than leaving no tag.

## Dependencies

FEAT-022's `create_tag` and `delete_tag`, and the detached checkout FEAT-023
already offers.
