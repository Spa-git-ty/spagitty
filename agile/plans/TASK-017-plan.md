<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-017 — Plan

**Item:** [`agile/items/TASK-017-flow-restore.md`](../items/TASK-017-flow-restore.md)

## Approach

Nothing is rewritten and nothing is forced. `main` and `dev` are both ancestors
of the stack, so the whole history is already a fast-forward away from being
integrated. The work is to build the path it travels along: push everything,
merge every item branch into this one, and open a single pull request into
`dev`.

This branch is the integration branch. Amendment 13 asks for one item per
branch, and integrating the stack is exactly this item's work, so the merges
belong here rather than on a branch invented for them.

## Steps

### 1. Push everything

`git push origin --all`, over every local head including the branches that
predate the amendments book. No force anywhere, and nothing to `main`.

- `feature/FEAT-019-commit-signing` already exists on the remote at an ancestor
  of its local tip, so it fast-forwards.
- Pushing `dev` creates it on the remote for the first time. The commit it
  points at carries no workflow file, so the push runs nothing.
- The archive branch holding the superseded footer commit goes up with the rest;
  that is what it is for.

### 2. Merge the stack together

Every item branch is merged into this one, in an order that puts the code first
and the records last:

```
the tab-strip bug · the renderer bug · the resume refactor · the glass
the conflicts footer · the dead remote · the document drift · the branch map
the first CI run
```

Two conflicts are known, from a `git merge-tree` probe rather than a guess:

| File | Why | Resolution |
| --- | --- | --- |
| `agile/README.md` | every branch adds its own index row at the same place | keep every row |
| `src/routes/conflicts/+page.svelte` | one branch restyles the screen, another removes its footer | keep the restyled markup with the footer gone |

Nothing else conflicts.

### 3. The identifiers that could not be cited yet

Several documents describe a sibling item in prose — "the item that maps the
stack", "the bug this is recorded against" — because `tools/record.test.ts`
fails on an identifier that resolves to nothing, and on a branch cut from a
common ancestor the sibling's item document does not exist.

This is the tree where they all exist. The prose is replaced with the real
identifiers as part of the merge, and the record test proves every one of them
resolves.

### 4. One pull request

`task/TASK-017-flow-restore` → `dev`, opened with `gh pr create`. The body names
every item it carries and points at the branch map for where each one landed.

### 5. Merge, once the gates are green

Gates 1 to 4 run on the pull request. What they find is the next item's work,
not this one's — this item ends when the stack is on `dev`.

## What this deliberately does not do

- **`main`.** No push, no pull request, no merge, no tag. It stays at the
  pre-rename commit until the author moves it.
- **A rewrite of the stack.** No rebase, no squash, no reordering. The history
  is what happened.
- **The old release plumbing.** The draft branch and the preview tags on the
  remote are left untouched.

## Risks

- **Pushing 50-odd branches at once.** Noisy on the forge, and irreversible in
  the sense that the branches are then public. It is what was asked for, and the
  alternative — work that exists on one machine only — is the risk this item was
  raised about. No branch protection is touched, and gates fire only on `main`
  and `dev`, so the push starts no pipeline.
- **A conflict resolved wrongly.** The two known ones are small and both are
  covered by the suite: the index by `tools/record.test.ts`, the Conflicts
  screen by its own tests. The full suite runs on the integration branch before
  the pull request is opened.
- **A merge that hides a broken combination.** Each branch was verified alone;
  none of them was verified together. That is precisely what the integration
  branch is for, and the verification below is run on the merged tree rather
  than on any single branch.

## Rollback

Every merge is an ordinary merge commit on this branch, and every source branch
still points at its own work. Undoing the integration is deleting nothing:
`task/TASK-017-flow-restore` is moved aside and cut again from the common
ancestor.

## Verification

- `npx vitest run` and `cargo test --workspace` on the merged tree.
- `npm run check` — 0 errors.
- `npm run coverage` — above the Amendment 10 floor.
- `npx vitest run tools/record.test.ts` — every index row, status and citation
  agrees with the merged tree.
- `git ls-remote --heads origin` — `dev` is there, and the branch count matches
  the local one.
- `git log --oneline -1 origin/main` — unchanged.
