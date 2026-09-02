<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-068 — Automated test record

**Item:** [`agile/items/FEAT-068-external-diff-merge-tools.md`](../items/FEAT-068-external-diff-merge-tools.md)

## What was tested

1. `crates/spagitty-core/src/tools.rs`:
   - `discovers_known_tools_catalogue`: asserts that known tools (VS Code, Meld, etc.) are catalogued.
   - `reads_and_writes_tool_configuration`: tests reading, updating, and clearing `diff.tool` configuration on git fixtures.
2. `src/lib/settings/tools-section.test.ts`:
   - Validates loading tools configuration from backend API.
   - Tests updating and resetting configured diff/merge tools.
3. `src/lib/diff/panes.test.ts`:
   - Validates `FileList` rendering and file action delegation.
4. `tools/record.test.ts`:
   - Triplet record verification and agile index integrity.

## Test command & output

```
$ cargo test -p spagitty-core tools
test tools::tests::discovers_known_tools_catalogue ... ok
test tools::tests::reads_and_writes_tool_configuration ... ok
test result: ok. 2 passed; 0 failed

$ bun run test src/lib/settings/tools-section.test.ts
✓ src/lib/settings/tools-section.test.ts (3 tests)
Test Files  1 passed (1)
Tests  3 passed (3)
```
