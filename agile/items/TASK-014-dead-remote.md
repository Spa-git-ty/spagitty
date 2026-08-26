<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-014 — The repository still points at a remote that no longer exists

**Status:** Done on `task/TASK-014-dead-remote`.
**Raised by:** the author: "remove linking to the dead remote".

## Problem

The repository carried two remotes:

```
origin     git@github.com:GitLumiere/gitlumiere.git
spagitty   git@github.com:Spa-git-ty/spagitty.git
```

`origin` is the pre-rename home of the project, from before TASK-004. It no
longer resolves:

```
GraphQL: Could not resolve to a Repository with the name 'GitLumiere/gitlumiere'. (repository)
```

Two remotes where one is dead is worse than one remote. Every `git fetch`
without an argument tries both; `origin` is the name every tool reaches for
first, so the default target of a push was the repository that is gone, and the
live one had to be named explicitly every time. `Cargo.toml:12` already declares
`https://github.com/Spa-git-ty/spagitty` as the repository, so the manifest and
the remote disagreed about where the project lives.

## The commit that only the dead remote knew about

Removing a remote deletes its remote-tracking refs. Twenty-seven of `origin`'s
refs were ancestors of `HEAD` and lost nothing. One was not:

```
1e093a4  add claude updates       mahmoud aref, 2026-08-18
```

It was the tip of `origin/feature/FEAT-040-graph-footer-facts`, it was not
reachable from `HEAD`, and that remote-tracking ref was the only thing keeping
it alive.

Its content is superseded: the `refreshedAt` state it introduced is live at
`src/lib/graph/store.svelte.ts:48`, having been rewritten into `a107fa6`
(FEAT-040) along with the plan and testing documents this commit predates. So
nothing is lost in substance — but it is authored history, and under Amendment 6
authored content is moved aside rather than dropped:

```
git branch archive/origin-FEAT-040-graph-footer-facts 1e093a4
```

The branch is the record. It is not merged, not built on, and not deleted.

## Change

1. `archive/origin-FEAT-040-graph-footer-facts` created at `1e093a4`.
2. `git remote remove origin` — the dead remote and its tracking refs.
3. `git remote rename spagitty origin` — the surviving remote takes the
   conventional name, so the default target of a fetch or a push is the
   repository that exists and the one the manifest names.

No branch carried upstream configuration, so nothing was left pointing at a
remote that had gone.

## Acceptance criteria

- One remote, named `origin`, pointing at `Spa-git-ty/spagitty`.
- `1e093a4` still reachable by name after the removal.
- No local branch with an upstream that does not resolve.
- Nothing deleted that a command cannot bring back.

## Non-scope

Restoring the Git Flow path — `dev` on the remote, the stack merged in by pull
request — is its own item, and is not started here. This item only stops the
repository pointing at a repository that is gone.

## Dependencies

TASK-004, which renamed the project and created the second remote without
retiring the first.
