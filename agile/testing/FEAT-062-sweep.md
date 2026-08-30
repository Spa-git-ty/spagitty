<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-062 — Manual sweep

**Item:** [`agile/items/FEAT-062-worktrees-management.md`](../items/FEAT-062-worktrees-management.md)

## Sweep tickets

| Ticket | Preconditions | Steps | Expected result | Priority | Result |
| --- | --- | --- | --- | --- | --- |
| SWEEP-FEAT062-01 | A repository with linked worktrees is open | 1. Click repository tabs menu (`+` or dropdown)<br>2. Click `Worktrees…` | Worktrees modal opens showing all attached working trees with their branches and commit SHAs | P1 | Pass |
| SWEEP-FEAT062-02 | Worktrees modal is open | 1. Click `+ Add Worktree`<br>2. Select a target directory path<br>3. Enter a new branch name<br>4. Click `Add Worktree` | New worktree is created on disk, checked out on the new branch, and appears in the worktrees list | P1 | Pass |
| SWEEP-FEAT062-03 | Worktrees modal is open with at least one linked worktree | 1. Click the lock icon next to a linked worktree<br>2. Check status | Worktree status badge updates to `🔒 locked` | P2 | Pass |
| SWEEP-FEAT062-04 | Worktrees modal is open | 1. Click `Open` next to an inactive worktree | Spagitty switches the active session to the selected worktree directory and reloads the graph | P1 | Pass |
| SWEEP-FEAT062-05 | Worktrees modal is open with a linked worktree | 1. Click the trash icon next to a linked worktree<br>2. Confirm removal | Linked worktree directory and administrative metadata are removed | P1 | Pass |
