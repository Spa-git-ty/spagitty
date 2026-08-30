<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-067 — Automated test record

**Item:** [`agile/items/FEAT-067-submodules-management.md`](../items/FEAT-067-submodules-management.md)

## What was tested

1. `crates/spagitty-core/src/submodules.rs`:
   - `parses_submodule_status_lines`: validates status prefixes (` `, `-`, `+`, `U`) distinguishing initialized, uninitialized, drifted, and conflicted submodule states.
   - `lists_submodules_in_fixture_repository`: tests listing submodules on fixture repositories.
2. `src/lib/submodules/store.test.ts`:
   - Store initialization state.
   - Fetching submodules and computing counts (total, uninitialized, drifted).
   - Updating submodules with path and recursive options.
   - Syncing URLs from `.gitmodules`.
   - De-initializing submodules.
   - Error handling on failed operations.
3. `tools/record.test.ts`:
   - Triplet record verification and agile index integrity.

## Test command & output

```
$ cargo test -p spagitty-core submodules
test submodules::tests::parses_submodule_status_lines ... ok
test submodules::tests::lists_submodules_in_fixture_repository ... ok
test result: ok. 4 passed; 0 failed

$ bun run test src/lib/submodules/store.test.ts
✓ src/lib/submodules/store.test.ts (6 tests)
Test Files  1 passed (1)
Tests  6 passed (6)
```
