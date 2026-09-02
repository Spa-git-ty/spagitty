<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-067 — Implementation plan

**Item:** [`agile/items/FEAT-067-submodules-management.md`](../items/FEAT-067-submodules-management.md)

## Approach

Implement a complete submodules management system spanning backend status parsing
and commands (`submodule_status`, `submodule_update`, `submodule_sync`, `submodule_deinit`),
Tauri IPC command registration, reactive Svelte 5 store, and an interactive
`SubmodulesModal.svelte` component accessible via the NavRail footer indicator and
command palette.

## Touched files

- `crates/spagitty-core/src/shell.rs`
- `crates/spagitty-core/src/submodules.rs`
- `crates/spagitty-core/src/lib.rs`
- `src-tauri/src/commands.rs`
- `src-tauri/src/lib.rs`
- `src/lib/types.ts`
- `src/lib/api.ts`
- `src/lib/submodules/store.svelte.ts`
- `src/lib/submodules/store.test.ts`
- `src/lib/submodules/modal.svelte.ts`
- `src/lib/submodules/SubmodulesModal.svelte`
- `src/lib/chrome/NavRail.svelte`
- `src/lib/palette/commands.ts`
- `src/routes/+layout.svelte`
- `agile/items/FEAT-067-submodules-management.md`
- `agile/plans/FEAT-067-plan.md`
- `agile/testing/FEAT-067-automated.md`
- `agile/testing/FEAT-067-sweep.md`

## Steps

1. Add submodule shell execution helpers in `crates/spagitty-core/src/shell.rs`.
2. Implement `submodules.rs` with `parse_submodule_status`, `list`, `update`, `sync`, and `deinit` with unit tests.
3. Expose IPC commands in `src-tauri/src/commands.rs` and register in `src-tauri/src/lib.rs`.
4. Add `Submodule` interface in `src/lib/types.ts` and API functions in `src/lib/api.ts`.
5. Implement `submodules` reactive store in `src/lib/submodules/` with unit tests.
6. Build `SubmodulesModal.svelte` component with interactive row actions.
7. Mount modal in `+layout.svelte`, link in `NavRail.svelte`, and register in command palette.
8. Validate with Rust cargo tests, Vitest test suite, and record test suite.
