<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-016 — One branch carried twenty-eight items

**Status:** Done on `task/TASK-016-branch-split`.
**Raised by:** a review of the repository against Amendment 13.

## Problem

Amendment 13 says one item, one branch: "A branch carries the work of a single
item. Unrelated changes discovered along the way become their own item and their
own branch rather than riding along."

`feature/FEAT-019-commit-signing` carries forty-five commits and roughly
twenty-eight items. It is named after one of them. Everything from the branches
table through the forge, the signing work, the reflog, the tags, two rendering
bugs and the glass rode along on it, and none of it has been merged anywhere.

The cost is not theoretical. A branch that carries one item can be reviewed,
merged or abandoned on its own. This one cannot: there is no way to take the
reflog without also taking the forge, no way to revert the update check without
reverting the tags, and a reviewer asked to look at "the signing branch" is
handed six weeks of unrelated work.

## Where each item actually landed

Recorded here because the branch name stopped being the answer a long time ago.
Commits are listed oldest first, as they sit on the branch.

| Item | Commit(s) |
| --- | --- |
| TASK-012 | `77c0e48`, `ad653b1` |
| TASK-013 | `9211303` |
| FEAT-041 | `7474c7e` |
| FEAT-042 | `7db6123` |
| FEAT-043 | `9c5a801` |
| FEAT-044 | `8c0d22c` |
| FEAT-040 | `a107fa6` |
| FEAT-045 | `2e69601` |
| FEAT-046 | `0765a64` |
| FEAT-047 | `6b1c7ae`, `cf94eaf` |
| TASK-004 | `b53615c`, `d9b87bd` |
| FEAT-048 | `58fa948` |
| FEAT-013 | `9c73af1` |
| FEAT-015 | `d0c6d4c` |
| FEAT-016 | `1ad313e` |
| FEAT-049 | `9db90e9`, `72936ba` |
| FEAT-050 | `fd0c68e`, `eebf760` |
| FEAT-051 | `62b8ee5` |
| FEAT-018 | `c770b7c` |
| FEAT-033 | `ff2545e` |
| TASK-003 | `c058381` |
| FEAT-034 | `90c7c81` |
| FEAT-019 | `50a9e4e`, `6fa1b7c` |
| BUG-010 | `ea64e42` |
| FEAT-017 | `3ffa365` |
| FEAT-052 | `b87b0a6` |
| FEAT-053, FEAT-054 | `9613e0e` — one commit, two items, and neither named in the subject |
| BUG-011, BUG-012 | `bcd68c4` |
| FEAT-055 | `345a999` |
| FEAT-056, and the session-restore bug | `c071e76` — two items, the second cited only in a source comment and given its record later |
| the glass | `356142f` — no identifier in the subject; it has one now, on its own branch |

Two rows above name their item in words rather than by identifier. Both belong
to items recorded on branches of their own, and `tools/record.test.ts` refuses a
citation that does not resolve in the same tree — correctly, since a reader who
followed one today would find nothing. They are written out when the branches
meet.

Four commits carry no item at all: `02d5d9d` and `d3d2807`, which added the
draft release workflow; `444f5fe`, which deleted a tag with it; and `01fca90`,
which pointed the manifest at the repository that exists. Release plumbing is
still work, and under Amendment 12 it still takes a `TASK-###`.

## What this item does, and what it deliberately does not

**It does not rewrite the branch.** Splitting forty-five commits into
twenty-eight branches retroactively means rebasing every one of them onto a
common base and hoping each still builds — forty-five chances to lose work in
exchange for a tidier history of work that is already done. Amendment 6 covers
destructive git operations by intent, and this would be one.

**It records where everything landed**, above, so the join between an item and
its code survives the branch name being wrong.

**It sets the rule going forward, and today already follows it.** Nine items
were worked in the session that wrote this document — five tasks, three bugs and
one feature — and each has its own branch, cut from `356142f`, carrying one or
two commits and nothing else:

```sh
git branch --list --no-merged 356142f
```

That listing also shows one `archive/` branch, which is not an item: it holds a
commit that a removed remote was the only reference to.

None of the nine stacks on another. Each can be reviewed, merged or dropped alone,
which is the whole point of the amendment. Their identifiers are not printed
here: each lives on a branch of its own, and a document that cited them would
resolve only after all six had merged.

## Acceptance criteria

- Every item on the stack resolves to the commit it landed in.
- The commits carrying no item are named, so the gap is visible rather than
  implied.
- No history is rewritten, no branch deleted, no commit dropped.
- New work from here is one item per branch.

## Non-scope

Merging any of it. Getting this work into `dev` and `main` is a separate item,
and under Amendment 14 the merge itself is the author's to authorise.

Writing items for the four unrecorded release-plumbing commits. They need one;
it is not this one.

## Dependencies

None. This is a record and a rule, not a change to the tree.
