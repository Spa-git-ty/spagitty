<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-014 — Manual sweep

**Item:** [`agile/items/TASK-014-dead-remote.md`](../items/TASK-014-dead-remote.md)

**Preconditions for every ticket:** a checkout of
`task/TASK-014-dead-remote`, a terminal at the repository root, and network
access to `github.com`.

---

## TASK-014-T1 — One remote, and it is the live one

**Priority:** high — the whole item.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Run `git remote -v` | Exactly two lines, both `origin`, both `git@github.com:Spa-git-ty/spagitty.git`. |
| 2 | Look for `gitlumiere` in the output | Not there. |
| 3 | Run `git remote -v` against `Cargo.toml:12` | The URL in the manifest and the URL of the remote are the same repository. |
| 4 | Run `git fetch` with no argument | It reaches one remote and succeeds. No error about a repository that cannot be found. |

**Result:**

---

## TASK-014-T2 — The archived commit survived

**Priority:** high — this is the Amendment 6 obligation, and the one step that cannot be undone if it was got wrong.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Run `git log --oneline -1 archive/origin-FEAT-040-graph-footer-facts` | `1e093a4 add claude updates`. |
| 2 | Run `git show --stat 1e093a4` | Ten files, the author's name, dated 2026-08-18. |
| 3 | Run `git branch --contains 1e093a4` | The archive branch is listed. |
| 4 | Run `git gc --prune=now`, then repeat step 1 | Still resolves. A branch is a real ref; collection does not touch it. |

**Result:**

---

## TASK-014-T3 — Nothing else was pointing at the dead remote

**Priority:** medium — a dangling upstream fails at the worst moment, on a push.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Run `git config --get-regexp '^branch\..*\.(remote\|merge)$'` | No line names a remote other than `origin`. |
| 2 | Check out any branch and run `git status` | No "upstream is gone" message. |
| 3 | Search the tree: `grep -rn "GitLumiere/gitlumiere" --exclude-dir=.git .` | Only historical references inside `agile/` and `docs/`, describing the rename. Nothing that a tool would read as configuration. |

**Result:**

---

## TASK-014-T4 — The archive is readable but not in the way

**Priority:** low — it exists to be read once, years from now.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Run `git log --oneline main..archive/origin-FEAT-040-graph-footer-facts` | A short list ending at `1e093a4` — the branch is not stacked on current work. |
| 2 | Confirm it is not an ancestor of any working branch: `git branch --contains 1e093a4` | Only the archive branch. |
| 3 | Read `agile/items/TASK-014-dead-remote.md` | It says why the commit is archived and where its content ended up (`src/lib/graph/store.svelte.ts:48`, via `a107fa6`). |
| 4 | Confirm nobody merged it | `git log` on `main` and on the working branch does not contain `1e093a4`. |

**Result:**

---

## TASK-014-T5 — The record agrees with the tree

**Priority:** medium — the drift this repository has been bitten by twice.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Run `npx vitest run tools/record.test.ts` | Green. |
| 2 | Open `agile/README.md` and find the TASK-014 row | Status `Done`, matching the item's `**Status:**` line. |
| 3 | Confirm all four documents exist for TASK-014 | Item, plan, automated, sweep. |

**Result:**
