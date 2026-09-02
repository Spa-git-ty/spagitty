<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-062 — Automated test record

**Item:** [`agile/items/FEAT-062-worktrees-management.md`](../items/FEAT-062-worktrees-management.md)

## What was tested

1. `crates/spagitty-core/src/worktrees.rs`:
   - `parses_porcelain_stream_correctly`: verifies porcelain stream parsing for main, linked, detached, locked, and prunable worktree entries.
   - `worktree_lifecycle_add_lock_unlock_remove`: executes real worktree addition on a temporary git fixture, verifies branch binding, locks, unlocks, and removes with force.
2. `src/lib/worktrees/store.test.ts`:
   - Store initialization state.
   - Fetching and parsing worktree lists.
   - Error handling on failed API calls.
   - Adding worktrees with parameter delegation.
   - Removing worktrees with force flags.
   - Locking and unlocking operations.
   - Stale worktree pruning.
3. `tools/record.test.ts`:
   - Verifies agile record completeness and four-document triplet consistency.

## Test command & output

```
$ cargo test -p spagitty-core worktrees
test worktrees::tests::parses_porcelain_stream_correctly ... ok
test worktrees::tests::worktree_lifecycle_add_lock_unlock_remove ... ok

$ bun run test src/lib/worktrees/store.test.ts
✓ src/lib/worktrees/store.test.ts (7 tests)
Test Files  1 passed (1)
Tests  7 passed (7)
```
