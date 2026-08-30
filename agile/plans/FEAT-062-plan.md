<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-062 — Implementation plan

**Item:** [`agile/items/FEAT-062-worktrees-management.md`](../items/FEAT-062-worktrees-management.md)

## Approach

Implement complete git worktree lifecycle management across `spagitty-core`, the
Tauri command layer, and the Svelte 5 frontend. Worktrees are listed via
`git worktree list --porcelain`, mutated via `git worktree add`, `remove`, `lock`,
`unlock`, and `prune`, and surfaced through reactive Svelte stores, an interactive
Worktrees manager modal, an Add Worktree modal, and repository tab integration.

## Touched files

- `crates/spagitty-core/src/shell.rs`
- `crates/spagitty-core/src/worktrees.rs`
- `crates/spagitty-core/src/lib.rs`
- `src-tauri/src/commands.rs`
- `src-tauri/src/lib.rs`
- `src/lib/types.ts`
- `src/lib/api.ts`
- `src/lib/worktrees/store.svelte.ts`
- `src/lib/worktrees/store.test.ts`
- `src/lib/worktrees/modal.svelte.ts`
- `src/lib/worktrees/AddWorktreeModal.svelte`
- `src/lib/worktrees/WorktreesModal.svelte`
- `src/lib/chrome/RepoTabs.svelte`
- `src/lib/palette/commands.ts`
- `src/routes/+layout.svelte`
- `agile/items/FEAT-062-worktrees-management.md`
- `agile/plans/FEAT-062-plan.md`
- `agile/testing/FEAT-062-automated.md`
- `agile/testing/FEAT-062-sweep.md`

## Steps

1. Add worktree shell execution helpers to `spagitty-core::shell`.
2. Implement `worktrees.rs` with `parse_worktree_porcelain`, lifecycle APIs, and unit tests using repository fixtures.
3. Expose Tauri IPC commands in `src-tauri/src/commands.rs` and register in `src-tauri/src/lib.rs`.
4. Define TypeScript interfaces in `src/lib/types.ts` and API wrappers in `src/lib/api.ts`.
5. Implement reactive Svelte 5 store in `src/lib/worktrees/store.svelte.ts` and test suite in `store.test.ts`.
6. Implement `AddWorktreeModal.svelte` and `WorktreesModal.svelte`.
7. Wire worktree modals into `+layout.svelte`, `RepoTabs.svelte`, and the command palette.
8. Validate with full Rust and Vitest test suites.
