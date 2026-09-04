<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-070 — Automated test record

**Item:** [`agile/items/FEAT-070-extended-forge-integration.md`](../items/FEAT-070-extended-forge-integration.md)

## What was tested

1. `crates/spagitty-core/src/forge.rs`:
   - `gitlab_and_bitbucket_remotes_are_identified`: validates remote URL identification for GitLab and Bitbucket hosts.
2. `crates/spagitty-core/src/forge/gitlab.rs`:
   - `parses_gitlab_merge_request_json`: validates mapping of GitLab MR JSON payloads into host-agnostic `PullRequest` structures.
3. `crates/spagitty-core/src/forge/bitbucket.rs`:
   - `parses_bitbucket_pull_requests_json`: validates mapping of Bitbucket Cloud pull request JSON payloads.
4. `src/lib/requests/create-pr.test.ts`:
   - Validates modal toggle state and `requests.create` API delegation.
5. `tools/record.test.ts`:
   - Triplet record verification and agile index integrity.

## Test command & output

```
$ cargo test -p spagitty-core forge
test forge::gitlab::tests::parses_gitlab_merge_request_json ... ok
test forge::bitbucket::tests::parses_bitbucket_pull_requests_json ... ok
test forge::tests::gitlab_and_bitbucket_remotes_are_identified ... ok
test result: ok. 73 passed; 0 failed

$ bun run test src/lib/requests/create-pr.test.ts
✓ src/lib/requests/create-pr.test.ts (2 tests)
Test Files  1 passed (1)
Tests  2 passed (2)
```
