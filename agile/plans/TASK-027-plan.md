<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-027 — Plan

**Item:** [`agile/items/TASK-027-migrate-the-js-toolchain-to-bun.md`](../items/TASK-027-migrate-the-js-toolchain-to-bun.md)

## Approach

Swap the runner first, keep the surface the same, verify everything the gates
run, then change the words that described the old runner. The risk is not in
any one conversion — `bun run <script>` is direct — but in the *set*: every
place node/npm is named must be found before it can be changed, which is why the
last step is a sweep of the tree and the docs.

The author's in-flight pull-request-review work is stashed so the branch starts
exactly where `dev` is; the gate-checking workflow is only ever executed on
push, so a build-and-test loop here is local and headless (Amendment 4).

## Decisions

- **bun pinned at 1.4.0 in `mise.toml`**, not `latest`, so what CI installs and
  what a contributor's `mise install` builds match.
- **The JSON key in the license list stays `npm`.** Behind the scenes it now
  means "the JS side"; renaming it touches generated data and its readers on
  both sides of the boundary for nothing.
- **Vitest stays under bun.** `bun test`, bun's own runner, is a different tool
  with different defaults; the scripts are the contract, and they point at
  vitest. The docs say `bun run test`, never bare `bun test`.
- **Ejecting the admin shell shim.** `run_claude_job.sh` drops its nvm `PATH`
  entry. The file is gitignored, so the request to change it is honoured locally
  and its absence from the commit is stated in the item.

## Files

- `mise.toml` (new), `bun.lock` (new), `package-lock.json` (removed to
  `~/claudetrashbin`)
- `.github/workflows/{gates,draft-release,prerelease}.yml`
- `src-tauri/tauri.conf.json`, `src-tauri/licenses.rs`, `src-tauri/build.rs`,
  `src-tauri/Cargo.toml`
- `docs/{ci,testing,screens}.md`, `CONTRIBUTING.md`
- `agile/` — this triplet and the index row; `CHANGELOG.md`

## Steps

1. Install latest bun through mise, pin it in `mise.toml`.
2. Convert `tauri.conf.json` and the three workflows.
3. Rewrite the npm half of `licenses.rs` to walk the installed production tree;
   re-run the `about::` tests.
4. `bun install`, move the npm lockfile, and run the headless battery:
   check, tests, coverage, build, `bun audit`, license check, cargo suite,
   fmt, clippy.
5. Reconcile the docs and the stale `npm run dev` comments.
6. Triplet, index row, changelog; commit.

## Risks and rollback

- **The license generator is the one real code change.** Its job is to produce
  a promise alongside the binary about what is inside it, so the acceptance
  criteria pin the output to the two packages that were there before. Rollback
  of that step is one module.
- **Coverage could dip if a command changes what runs.** Nothing here deletes a
  test; the floor holds because the suite is unchanged. If a bun-launched run
  ever filtered differently, the numbers would say so at gate 3.
- **Rollback is a revert of one commit** plus restoring
  `~/claudetrashbin/spagitty-package-lock.json`; nothing is structural.