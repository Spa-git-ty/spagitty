<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-050 — Reflog view

**Status:** Done on `feature/FEAT-050-reflog`.
**Screen:** Reflog (1M).
**Requested by:** the gap analysis
[`docs/analysis/gitkraken-gap.md`](../../docs/analysis/gitkraken-gap.md),
2026-08-24: "absent entirely. After any history rewrite goes wrong, the reflog
is where recovery starts."

## Why this identifier

FEAT-049 was the last one handed out. This is the next.

## Problem

Every screen in Spagitty answers what history looks like. None answered what was
just done to it, which is the only question that helps after a rewrite goes
wrong: a `reset --hard` on the wrong commit, a rebase that dropped something, a
branch deleted a minute too soon. None of those are visible in the graph
afterwards and all of them are one line in a reflog.

It became urgent rather than nice-to-have with FEAT-015 and FEAT-016. Those made
rewriting history something Spagitty does rather than something people go to a
terminal for, and a client that raises the stakes without raising the floor is a
worse client than one that could not rewrite at all. FEAT-013's delete
confirmation already tells people to type `git branch <name> <id>` — this is the
screen where the id comes from.

## Wanted

- Every move of a ref, newest first, with the revision (`HEAD@{3}`) that reaches
  it, what operation moved it, from and to, and when.
- `HEAD` by default, because its log records checkouts as well as moves; a
  branch's own log on request.
- A filter over operation and message.
- Three recoveries from an entry: branch here, check out here, reset here.

## Non-scope

- **Expiring or writing reflogs.** `git reflog expire` is maintenance, not
  recovery, and it is the one reflog command that can make things worse.
- **Remote-tracking refs' logs.** They record fetches rather than anything the
  user did, and nobody looks there after a mistake.
- **A graph of unreachable commits.** Interesting, and a different item.

## Acceptance criteria

- The entries and their `@{n}` numbering match `git reflog` for the same ref.
- A repository with reflogs turned off says so, distinctly from a ref that has
  simply not moved.
- Branch-here creates a ref and moves nothing else.
- Reset-here says that uncommitted work is not in any reflog before it runs.

## Dependencies

FEAT-004's branch creation, and the reset the graph already offers.
