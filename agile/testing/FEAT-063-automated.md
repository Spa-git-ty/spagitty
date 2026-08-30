<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-063 — Automated test record

**Item:** [`agile/items/FEAT-063-file-history-and-blame.md`](../items/FEAT-063-file-history-and-blame.md)

## What was tested

1. `crates/spagitty-core/src/blame.rs`:
   - `parses_null_delimited_file_history_stream`: parses null-separated commit logs with author, email, timestamp, and summary.
   - `file_history_walks_fixture_commits`: walks file history on repository fixture and asserts commit author names.
   - Blame parsing and line attribution regression tests.
2. `src/lib/history/store.test.ts`:
   - Store initialization state.
   - Inspecting a file path and populating commit history and blame line attribution.
   - Highlighting commit lines by SHA.
   - Error handling when file paths cannot be resolved.
3. `src/lib/nav.test.ts`:
   - Off-rail screen registration for `/history` under screen code `1O`.
4. `tools/record.test.ts`:
   - Triplet record verification and agile index integrity.

## Test command & output

```
$ cargo test -p spagitty-core blame
test blame::tests::parses_null_delimited_file_history_stream ... ok
test blame::tests::file_history_walks_fixture_commits ... ok
test result: ok. 19 passed; 0 failed; 0 ignored

$ bun run test src/lib/history/store.test.ts
✓ src/lib/history/store.test.ts (4 tests)
Test Files  1 passed (1)
Tests  4 passed (4)
```
