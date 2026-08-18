# GitKraken — The Commit Graph, In Depth

A focused breakdown of the graph alone: what it renders, what every interaction does, what it refuses to do, and where it breaks down.

---

## 1. The rendering model

The graph is a visual representation of the repository's DAG (Directed Acyclic Graph).

- **Each row is one commit.** Newest at the top, oldest at the bottom.
- **Each column is a lane**, roughly corresponding to a branch line.
- **Lines between rows** express parent/child relationships; a row with two incoming lines is a merge.
- **Reading direction:** trace branch history bottom-to-top and right-to-left.

The important design decision: the graph is a *table*, not a free-form canvas. Rows align to commits, columns align to metadata fields, and the "graph" itself is just one column among several. That's why it stays readable at scale where a free-drawing DAG would turn into spaghetti.

### Node types

| Node | What it represents |
|---|---|
| Commit | A regular circle on a colored lane |
| Merge commit | Distinct shape with two incoming lines |
| WIP node | Always the topmost node — uncommitted working-directory changes |
| Stash node | Stashes are drawn as real nodes on the graph, not hidden in a side list |

### Attached decorations

- **Branch labels** and **tag labels** sit directly on their commit
- **Remote branches** carry the hosting provider's icon (GitHub, GitLab, Bitbucket, Azure DevOps)
- **Author avatars** on the commit row
- **Ghost branch** — a faded connector shown on hover/select, pointing to the nearest containing reference

---

## 2. Columns

Default columns: `Branch/Tag`, `Graph`, `Commit Message`.

- Right-click the column header (or use the gear icon) to toggle `Author`, `Date/Time`, and `SHA`
- Drag column headers to reorder
- Drag the dividers to resize — including resizing the graph column itself
- Column selection, width, and order are **saved per repository**
- Also configurable from `Preferences > UI Customization`
- The AUTHOR column carries a filter control for filtering commits by author or team

---

## 3. Interactions — the full map

### Single click

| Target | Result |
|---|---|
| Any commit | Details load in the Commit Panel: changed files, diffs, metadata |
| WIP node | Opens the staging view — unstaged files, staged files, commit message |
| Branch label | Selects it (checkout requires double-click) |

### Double click

| Target | Result |
|---|---|
| Branch label (graph or Left Panel) | Checkout |
| Ghost branch | Checks out the nearest branch containing that commit |

### Hover

| Target | Result |
|---|---|
| Branch | All commits belonging to it highlight; everything unrelated fades. Toggleable in `Preferences > UI Customization` |
| Commit | Ghost branch appears, showing the closest reference |

### Right-click on a commit

- **Create branch here** — the fastest branch creation path in the app
- **Create tag here**
- **Reset to this commit** — with soft / mixed / hard spelled out in plain language
- **Revert**
- **Cherry pick**
- **Rebase onto this commit** — if the commit has no branch attached, it replays your current HEAD's commits onto that exact point, with no temporary branch needed
- **Share commit as Cloud Patch** (requires the Git Executable experimental setting)
- **Copy SHA**
- **Checkout this commit** — enters detached HEAD

### Right-click on a branch label

- **Merge** / **Rebase** / **Fast-forward**
- **Rename**
- **Delete** — requires being checked out elsewhere first, and is permanent
- **Pull** / **Push**
- **Pin to left** — locks the branch to the left edge of the graph so its direct history always renders on the left. Built for long-lived branches like `main` or a production branch, where you want a stable visual anchor to see what merges into what. Undo it with **Unpin from left**
- **Hide**

### Drag & drop

The signature interaction:

- Drag one branch onto another → a menu offers **merge**, **rebase**, or **fast-forward**
- The gesture itself carries the semantics: *source dropped onto target*, which is the exact mental model people get wrong when typing `git rebase`

### Multi-select (Shift for range, Cmd/Ctrl for individual)

- **Cherry pick X commits** — select several, right-click, apply as a group. Before completing you can reorder, squash, drop, or rename
- **Rebase X commits onto [branch]** — select a range on the source branch, then right-click the target branch. Rebases a subset without a full interactive rebase
- **Pivot-commit variant** — select a single commit mid-branch (with no merge commits between it and the branch head), right-click the target branch, and it rebases that commit plus everything after it

---

## 4. Visibility and noise control

This is where the graph earns its keep in real repositories:

- **Smart Branch Visibility** — gear icon at the top-right of the graph header. When on, the graph shows only your checked-out branch, its target branch, and their respective upstreams. Everything else is hidden. It activates on whatever branch you currently have checked out
- **Hide** — remove specific branches from view
- **Solo** — isolate a branch and hide everything else
- **Pin to left** — keeps a fixed reference lane so the layout doesn't reshuffle as you move around
- **Author/team filter** — from the AUTHOR column
- **Commit highlighting on hover** — a temporary, zero-cost version of soloing

---

## 5. What the graph will *not* do

Worth knowing precisely if you're evaluating or rebuilding it:

| Limitation | Detail |
|---|---|
| No dragging commits | You can't drag a commit to reorder it or move it to a different branch. Reordering lives in the Interactive Rebase view |
| No inline message editing | You can't edit an old commit's message from the graph. Only the latest commit via amend; older ones need an interactive rebase |
| Layout is not manual | Lanes and line routing are computed. You can't drag a commit from one column to another or pin a lane order beyond "pin to left" |
| No graph zoom | The status bar zoom (100%–200%) scales the whole interface, not the graph independently |
| No multi-repo graph | Workspaces gives you a list of repositories, not a single merged DAG |
| Conflict editor is paid | The in-app merge conflict output editor requires a paid license, even though conflicts surface in the free version |
| Undo is partial | It covers reversible local operations, not everything you can do from the graph |
| Large-repo performance | The most consistently repeated user complaint: responsiveness drops on very large repositories or very long histories |

---

## 6. Design lessons worth stealing

If the goal is to understand *why* this graph works:

1. **The gesture encodes the semantics.** Dragging source onto target removes the direction ambiguity that makes `rebase` and `merge` scary.
2. **Destructive operations are labeled by effect, not by flag name.** "Reset to this commit" with soft/mixed/hard described in words beats memorizing flags.
3. **Ghost branches solve orientation, not navigation.** The real question in a big graph is "where am I relative to something I recognize" — ghost branches answer that without a click.
4. **Noise control is a first-class feature, not a setting.** Smart Branch Visibility, hide, solo, and pin-to-left all exist because a truthful graph of a real repo is unreadable by default.
5. **State is remembered per repo.** Column layout, widths, and tabs persist per repository and per profile, so the graph never resets your context.
6. **The graph is a launcher.** Almost every operation in the app is reachable from a right-click on a node — the graph is the primary navigation surface, not a read-only report.

---

*Note: exact context-menu wording and item placement shift between releases. Verify against the version you're targeting.*

## Sources

- GitKraken Desktop Interface Guide — help.gitkraken.com/gitkraken-desktop/interface/
- Branch, Merge, and Rebase — help.gitkraken.com/gitkraken-desktop/branching-and-merging/
- Hide and Solo, Interactive Rebase, Cherry Pick — help.gitkraken.com/gitkraken-desktop/
- Experimental Features — help.gitkraken.com/gitkraken-desktop/experimental-features/
