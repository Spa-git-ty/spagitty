<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-063 — Implementation plan

**Item:** [`agile/items/FEAT-063-file-history-and-blame.md`](../items/FEAT-063-file-history-and-blame.md)

## Approach

Implement a dedicated File History & Blame screen (1O, `/history`) and interactive
component. The backend exposes `blame::history` tracking commit evolution with rename
following (`--follow`), while `blame::file` provides line-level attribution. The frontend
couples commit timeline browsing with an interactive blame gutter that highlights all
lines belonging to the hovered or selected commit and links directly into the Graph view.

## Touched files

- `crates/spagitty-core/src/shell.rs`
- `crates/spagitty-core/src/blame.rs`
- `src-tauri/src/commands.rs`
- `src-tauri/src/lib.rs`
- `src/lib/types.ts`
- `src/lib/api.ts`
- `src/lib/nav.ts`
- `src/lib/history/store.svelte.ts`
- `src/lib/history/store.test.ts`
- `src/lib/history/FileHistoryView.svelte`
- `src/lib/palette/commands.ts`
- `src/routes/history/+page.svelte`
- `docs/screens.md`
- `agile/items/FEAT-063-file-history-and-blame.md`
- `agile/plans/FEAT-063-plan.md`
- `agile/testing/FEAT-063-automated.md`
- `agile/testing/FEAT-063-sweep.md`

## Steps

1. Add `file_history` shell command runner in `crates/spagitty-core/src/shell.rs`.
2. Add `FileHistoryEntry`, `parse_file_history`, `history` function and unit tests in `crates/spagitty-core/src/blame.rs`.
3. Expose Tauri command `commands::file_history` in `src-tauri`.
4. Add `FileHistoryEntry` interface in `src/lib/types.ts` and `api.fileHistory` in `src/lib/api.ts`.
5. Implement `fileHistory` reactive store and unit tests in `src/lib/history/`.
6. Implement `FileHistoryView.svelte` component with timeline, blame gutter, and jump-to-graph action.
7. Add route `src/routes/history/+page.svelte` and register in `src/lib/nav.ts` and `src/lib/palette/commands.ts`.
8. Update `docs/screens.md` with screen code 1O.
9. Validate with Rust cargo tests, Vitest test suite, and agile record checks.
