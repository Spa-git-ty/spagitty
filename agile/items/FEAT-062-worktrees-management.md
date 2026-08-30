<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-062 — Worktrees management

**Status:** Backlog
**Screens:** All repositories (1J), chrome (repository tabs / switcher).
**Raised by:** gap analysis in `docs/analysis/gitkraken-gap.md`.

## Problem

Git worktrees allow multiple working trees to be attached to the same repository,
enabling simultaneous checkouts of different branches without stashing or context
switching. Spagitty currently treats each directory as a completely separate
repository or fails to recognize linked worktrees, forcing users to manage
`git worktree add`, `list`, `lock`, `unlock`, and `remove` entirely from the terminal.

## Change

- **Core worktree engine in `spagitty-core`:**
  - Expose `worktrees::list(repo_path)` returning all linked working trees, their paths,
    checked-out branches/commit hashes, and locked status.
  - Expose `worktrees::add(repo_path, target_path, branch, new_branch)` with path validation.
  - Expose `worktrees::remove(repo_path, target_path, force)` with guardrails against removing dirty worktrees.
  - Expose `worktrees::prune(repo_path)` to clean stale metadata.
- **Frontend integration:**
  - Surface a Worktrees section under the repository switcher / tabs in the chrome.
  - In All Repositories (1J), group worktrees visually under their parent repository card.
  - Provide a modal to add a new worktree with branch selection and path browse dialog.
  - Allow quick-switching the active session window to a linked worktree.

## Non-scope

- Auto-creating detached worktrees for transient background rebases.
- Cloud syncing of worktree paths across machines.

## Acceptance criteria

- `spagitty-core` unit tests verify listing, adding, removing, and locking worktrees.
- UI prevents deleting a worktree that contains uncommitted changes unless force is explicitly confirmed.
- Switching to a worktree opens the target path seamlessly in the tab bar.
- `tools/record.test.ts` passes.
