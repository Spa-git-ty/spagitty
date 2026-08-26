<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-014 — Automated tests

**Item:** [`agile/items/TASK-014-dead-remote.md`](../items/TASK-014-dead-remote.md)

## No unit tests, and why not

This item changes `.git/config` and the ref namespace. There is no product code
in it, and a test asserting that a repository has one remote would fail on every
clone that legitimately has two — a fork, a mirror, a colleague's checkout.
Under Amendment 10 that is padding, not coverage, and it is not written.

What replaces it is a check that was run before the irreversible step, and whose
output is recorded here.

## The check that mattered — run before the removal

Every remote-tracking ref was tested for reachability from `HEAD`, because a ref
that is an ancestor loses nothing when it is deleted and a ref that is not is
the only thing keeping a commit alive:

```sh
for r in $(git for-each-ref --format='%(refname:short)' refs/remotes/origin); do
  git merge-base --is-ancestor "$r" HEAD || echo "NOT-ANCESTOR: $r"
done
```

Result — twenty-eight refs, one answer that was not silence:

```
NOT-ANCESTOR-OF-HEAD: origin/feature/FEAT-040-graph-footer-facts 1e093a4
```

That commit was branched to `archive/origin-FEAT-040-graph-footer-facts` before
anything was removed.

## Recorded run results

```
$ git remote -v
origin  git@github.com:Spa-git-ty/spagitty.git (fetch)
origin  git@github.com:Spa-git-ty/spagitty.git (push)

$ git branch -r
  origin/draft/0.1.0-preview
  origin/feature/FEAT-019-commit-signing
  origin/main

$ git log --oneline -1 archive/origin-FEAT-040-graph-footer-facts
1e093a4 add claude updates
```

Upstream configuration was swept for references to the removed remote:

```sh
git config --get-regexp '^branch\..*\.(remote|merge)$'
```

No output — no local branch had an upstream, so nothing was left dangling.

## The suite is unaffected, and that is asserted

The record test is the one automated check this item can actually fail:
`tools/record.test.ts` reads `agile/README.md` against the tree and fails on a
missing row, a row with no document, or a status that disagrees with its item.
Adding TASK-014 to the index without its four documents fails the suite. Those
four documents are also why the count moved: `tools/record.test.ts` builds a
case per document in `agile/`, so the tree that was 1744 tests before this item
is 1748 with it.

```
npx vitest run    72 files, 1748 tests, all passing
```

## Coverage

No first-party source line changed, so the Amendment 10 figure is untouched by
this item. It is measured again by whichever item next adds source.
