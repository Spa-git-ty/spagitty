<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-068 — Implementation plan

**Item:** [`agile/items/FEAT-068-external-diff-merge-tools.md`](../items/FEAT-068-external-diff-merge-tools.md)

## Approach

Implement external diff and merge tool integration. In `spagitty-core::tools`,
discover installed tools on `$PATH` (VS Code, Meld, Beyond Compare, KDiff3, Sublime,
Vimdiff), read and write `diff.tool` and `merge.tool` configuration, and launch tools
detached via `git difftool` and `git mergetool`. In the frontend, add `ExternalToolsSection`
under Settings (screen 1K) and context menu triggers on diff file items.

## Touched files

- `crates/spagitty-core/src/shell.rs`
- `crates/spagitty-core/src/tools.rs`
- `crates/spagitty-core/src/lib.rs`
- `src-tauri/src/commands.rs`
- `src-tauri/src/lib.rs`
- `src/lib/types.ts`
- `src/lib/api.ts`
- `src/lib/settings/store.svelte.ts`
- `src/lib/settings/ExternalToolsSection.svelte`
- `src/lib/settings/tools-section.test.ts`
- `src/routes/settings/+page.svelte`
- `src/lib/diff/FileList.svelte`
- `agile/items/FEAT-068-external-diff-merge-tools.md`
- `agile/plans/FEAT-068-plan.md`
- `agile/testing/FEAT-068-automated.md`
- `agile/testing/FEAT-068-sweep.md`

## Steps

1. Implement `get_config`, `launch_difftool`, and `launch_mergetool` in `crates/spagitty-core/src/shell.rs`.
2. Implement `tools.rs` with `known_diff_tools`, `known_merge_tools`, `get_config`, and `set_tool` with unit tests.
3. Expose Tauri IPC commands in `src-tauri`.
4. Add `ExternalToolsConfig` and `ExternalToolInfo` interfaces in `src/lib/types.ts` and `src/lib/api.ts`.
5. Add `ExternalToolsSection.svelte` in `src/lib/settings/` and register in Settings page.
6. Add context menu launch action in `src/lib/diff/FileList.svelte`.
7. Validate with Rust and Vitest test suites.
