<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-069 — Automated test record

**Item:** [`agile/items/FEAT-069-multi-identity-profiles.md`](../items/FEAT-069-multi-identity-profiles.md)

## What was tested

1. `crates/spagitty-core/src/identity.rs`:
   - Profile application (`apply_profile`) updating `user.name`, `user.email`, and `user.signingkey` across local and global scopes.
2. `src/lib/profiles/store.test.ts`:
   - Store initialization state.
   - Fetching and populating profiles list.
   - Saving new profiles and updating existing ones.
   - Deleting profiles by id.
   - Applying profiles to local or global scopes.
3. `tools/record.test.ts`:
   - Triplet record verification and agile index integrity.

## Test command & output

```
$ cargo test -p spagitty-core identity
test identity::tests::a_repository_reports_its_own_identity ... ok
test result: ok. 14 passed; 0 failed

$ bun run test src/lib/profiles/store.test.ts
✓ src/lib/profiles/store.test.ts (5 tests)
Test Files  1 passed (1)
Tests  5 passed (5)
```
