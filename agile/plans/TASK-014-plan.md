<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-014 — Plan

**Item:** [`agile/items/TASK-014-dead-remote.md`](../items/TASK-014-dead-remote.md)
**Branch:** `task/TASK-014-dead-remote`
**Base:** `356142f`, not `dev`. `dev` sits at `4e8ea60` — 71 commits behind the
work — so a branch cut from it would carry none of the code this repository
currently is. The author approved that base with the plan; repairing the flow
itself is a separate item, not this one.

## Approach

Three git commands, in an order that matters.

```sh
git branch archive/origin-FEAT-040-graph-footer-facts 1e093a4
git remote remove origin
git remote rename spagitty origin
```

**The archive comes first**, because the second command is what makes it
necessary. `git remote remove` deletes the remote's tracking refs, and one of
them — `origin/feature/FEAT-040-graph-footer-facts` — was the only reference to
`1e093a4`. Once the ref is gone the commit is unreferenced and collectable, and
there is no name left to type to get it back.

The reachability check that found it is worth keeping, because it is what turns
"probably fine" into a fact:

```sh
for r in $(git for-each-ref --format='%(refname:short)' refs/remotes/origin); do
  git merge-base --is-ancestor "$r" HEAD || echo "NOT-ANCESTOR: $r"
done
```

Twenty-seven refs passed. One did not, and got the archive branch.

## Decisions

- **Remove, not rename to `old-origin`.** A remote kept "just in case" is
  fetched by tooling that iterates remotes, and it points at a repository that
  returns an error. What is worth keeping from it is one commit, and a branch
  keeps that better than a dead remote does.
- **The survivor takes the name `origin`.** It is what every tool defaults to,
  what `gh` resolves against, and what `Cargo.toml:12` already declares. Leaving
  it as `spagitty` would mean a repository with no `origin` at all, which breaks
  the default of every command that has one.
- **The archive branch is not merged.** Its content is superseded by `a107fa6`;
  merging it would resurrect an older `FEAT-040` and delete the plan and testing
  documents that TASK-013 backfilled. It exists to be readable, not to be used.

## Files

No source file changes. The change is to `.git/config` and the ref namespace,
plus this item's four record documents and the index row in `agile/README.md`.

## Testing

Headless, and stated in the automated document: the reachability sweep before
the removal, and after it `git remote -v`, the archive branch resolving, and a
scan for upstream configuration left pointing at a remote that has gone.

## Risk

Low but one-way in one respect: a remote-tracking ref cannot be recreated
without the remote, and the remote does not answer. That is why the archive is
step one rather than a cleanup afterwards.

## Rollback

```sh
git remote rename origin spagitty
git remote add origin git@github.com:GitLumiere/gitlumiere.git
```

The tracking refs do not come back — `git fetch origin` would have to reach a
repository that no longer exists. `archive/origin-FEAT-040-graph-footer-facts`
is what makes that acceptable: the one ref worth restoring is already restored,
as a branch, permanently.
