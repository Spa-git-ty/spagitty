<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-066 — Implementation plan

**Item:** [`agile/items/FEAT-066-diff-content-search.md`](../items/FEAT-066-diff-content-search.md)

## Approach

Extend the commit search pipeline to support searching inside patch / diff content.
In `spagitty-core::search`, add `diff_content: Option<String>` to `Query` and
implement `touches_diff_content` which walks the tree differences of candidate
commits against their parents to match added or removed lines. In the frontend,
expose the `diff content` query field and chip in `QueryBar.svelte` and `search` store.

## Touched files

- `crates/spagitty-core/src/search.rs`
- `src/lib/types.ts`
- `src/lib/search/store.svelte.ts`
- `src/lib/search/store.test.ts`
- `src/lib/search/QueryBar.svelte`
- `agile/items/FEAT-066-diff-content-search.md`
- `agile/plans/FEAT-066-plan.md`
- `agile/testing/FEAT-066-automated.md`
- `agile/testing/FEAT-066-sweep.md`

## Steps

1. Add `diff_content` field to `Query` struct and update `narrowest` and `is_empty` methods in `crates/spagitty-core/src/search.rs`.
2. Implement `touches_diff_content` inspecting tree diff changes and added/removed line contents with unit tests.
3. Update `SearchQuery` interface in `src/lib/types.ts`.
4. Update `search` reactive store and unit tests in `src/lib/search/store.svelte.ts`.
5. Add `diff content` input field and chip handling in `src/lib/search/QueryBar.svelte`.
6. Validate with full Rust and Vitest test suites.
