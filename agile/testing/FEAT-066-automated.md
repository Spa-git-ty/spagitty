<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-066 — Automated test record

**Item:** [`agile/items/FEAT-066-diff-content-search.md`](../items/FEAT-066-diff-content-search.md)

## What was tested

1. `crates/spagitty-core/src/search.rs`:
   - `diff_content_filter_matches_commits_modifying_matching_lines`: asserts that searching by diff content text (`"LINE THREE"`) matches commits introducing or removing those lines.
   - `the_narrowest_filter_is_named_for_an_empty_result_to_point_at`: tests query narrowing logic including `diff_content`.
2. `src/lib/search/store.test.ts`:
   - Validates that `diffContent` is properly trimmed and sent to backend `searchStart` payload.
   - Validates that `diffContent` generates matching chips (`diff:keyword`) and supports chip removal.
3. `tools/record.test.ts`:
   - Triplet record verification and agile index integrity.

## Test command & output

```
$ cargo test -p spagitty-core search
test search::tests::diff_content_filter_matches_commits_modifying_matching_lines ... ok
test result: ok. 16 passed; 0 failed

$ bun run test src/lib/search/store.test.ts
✓ src/lib/search/store.test.ts (34 tests)
Test Files  1 passed (1)
Tests  34 passed (34)
```
