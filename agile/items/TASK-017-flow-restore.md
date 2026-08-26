<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-017 — Seventy-one commits with no path back to `main`

**Status:** Open on `task/TASK-017-flow-restore`.
**Raised by:** a review of the repository against Amendment 14.

This was Backlog, with an item document and nothing else, because four of its
decisions were the author's and none of them had been made. They have been
answered now, so the plan and the testing documents are written and the work is
under way. The answers are recorded below in place of the questions.

## Problem

Nothing has been merged in a long time.

| Ref | Where it sits |
| --- | --- |
| `origin/main` | `c46c603`, "Fix cargo-deny…" — the state before the project was renamed |
| local `main` | the same commit |
| local `dev` | `4e8ea60`, "Scaffold GitLord and implement the Graph screen" |
| the work | 71 commits past `main`, 95 past `dev` |

`dev` is the integration branch under Amendment 14, and it holds the second
commit this project ever had. There is no `dev` on the remote at all — the
remote carries `main`, one draft release branch, and the stack.

Everything since is on feature branches, none merged, and `main` still describes
a project called GitLumiere. There is no released state that resembles the
application, and no tag: `git tag` is empty, so nothing has been published even
as a pre-release.

The good news is topological, and it is why this is a task rather than a rescue:
`main` and `dev` are both ancestors of the stack. Nothing has diverged, nothing
conflicts, and the whole history is a fast-forward away from being integrated.

## Why it matters beyond tidiness

- **The gates never run.** Gate 1–4 fire on pull requests into `main` and `dev`,
  and on pushes to them. With no pull request and no merge, six months of work
  has never been license-checked, lint-checked, security-scanned or built on
  macOS or Windows. That is a separate item, and it is unblocked by this one.
- **A release is impossible.** Gate 6 publishes from `main`. `main` is the old
  project.
- **One branch is a single point of failure.** Every item since the rename lives
  on one unmerged local branch, on one machine.

## Shape of the work

1. `dev` exists on the remote and is protected, as Amendment 14 requires of it.
2. The stack goes into `dev` by pull request — the first pull request the
   project has had since the rename, and the first real run of the gates.
3. What the gates find is fixed on branches, by pull request, not by turning a
   gate off.
4. `dev` goes into `main` by pull request when it is green, through a
   `release/` branch if stabilisation is needed.
5. `main` is tagged, and the tag carries release notes.

## What the author decided

Each of these was Amendment 8's author-owned kind: nothing in the code answered
them. All four were answered in the session that opened this item.

1. **The whole stack goes in as one pull request.** Not in pieces. It is honest
   about how the work was done, and reconstructing an order that was never
   separated would cost more than the review gains.
2. **Numbering restarts at `0.1.0`** and climbs from there. Every manifest
   already says `0.1.0`, so nothing is bumped for this; the first tag on `main`
   is the author's to make.
3. **The old release plumbing gets no items.** The draft branch and the two
   preview tags on the remote were a one-off ask and are ignored rather than
   recorded. They are left exactly where they are — Amendment 14 forbids moving
   a tag, and neither collides with `v0.1.0`.
4. **Branch protection.** The agent may open pull requests and merge into any
   branch **except `main`**. `main` is the author's alone: no push, no pull
   request, no merge and no tag there without them.

## Non-scope

The gates' first run, and whatever it turns up. That is its own item; this one
ends when there is a path for it to run on.

## Dependencies

The dead-remote task, which left one remote pointing at a repository that
exists, and the task that mapped where each item on the stack landed — worth
having before anyone tries to review 71 commits. Both are recorded on branches
of their own, so their identifiers are written into this item when the branches
meet rather than cited into a tree that cannot resolve them.

This branch is also where they meet: it is the integration branch, because
merging the stack together **is** this item's work. Every other item's branch is
merged into it, and the single pull request is opened from it.
