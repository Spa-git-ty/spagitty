<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-070 — Implementation plan

**Item:** [`agile/items/FEAT-070-extended-forge-integration.md`](../items/FEAT-070-extended-forge-integration.md)

## Approach

Extend the forge subsystem (`spagitty-core::forge`) with multi-host support (GitLab,
Bitbucket Cloud) and in-app pull request creation. In `spagitty-core`, add `gitlab.rs`
and `bitbucket.rs` handling REST API authentication, merge request listings, and creation.
In `src-tauri`, expose the `create_pull_request` command. In the frontend, extend `ForgeKind`,
add `CreatePRModal.svelte` with branch target selection, and integrate into the Pull
requests workspace (1H).

## Touched files

- `crates/spagitty-core/src/forge.rs`
- `crates/spagitty-core/src/forge/github.rs`
- `crates/spagitty-core/src/forge/gitlab.rs`
- `crates/spagitty-core/src/forge/bitbucket.rs`
- `src-tauri/src/commands.rs`
- `src-tauri/src/lib.rs`
- `src/lib/types.ts`
- `src/lib/api.ts`
- `src/lib/requests/store.svelte.ts`
- `src/lib/requests/CreatePRModal.svelte`
- `src/lib/requests/create-pr.test.ts`
- `src/routes/requests/+page.svelte`
- `agile/items/FEAT-070-extended-forge-integration.md`
- `agile/plans/FEAT-070-plan.md`
- `agile/testing/FEAT-070-automated.md`
- `agile/testing/FEAT-070-sweep.md`

## Steps

1. Implement `gitlab.rs` and `bitbucket.rs` in `crates/spagitty-core/src/forge/`.
2. Add `create_pull_request` implementations across GitHub, GitLab, and Bitbucket providers.
3. Update `Kind` enum and `identify` parser in `crates/spagitty-core/src/forge.rs` with unit tests.
4. Expose `commands::create_pull_request` in `src-tauri`.
5. Update `ForgeKind` interface in `src/lib/types.ts` and API functions in `src/lib/api.ts`.
6. Add `CreatePRModal.svelte` and integrate into `src/routes/requests/+page.svelte` and `requests` store.
7. Validate with Rust and Vitest test suites.
