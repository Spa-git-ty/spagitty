<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-027 — Migrate the JS toolchain to bun

**Status:** Open on `task/TASK-027-migrate-to-bun`.
**Screens:** —.
**Raised by:** the author, by instruction: the machine standardises on bun, and
the frontend toolchain was the last stack still on node/npm.

## Problem

npm is the original installer choice, made before the machine settled on
`mise` and bun. It is now the odd one out in three ways:

**It needs node.** The project's toolchain is invoked through the nvm shim
installed in `run_claude_job.sh`, a path that is one more moving part to break
and one more thing a clone does not get. bun is managed by `mise` like
everything else on the machine and is already the fastest installer around.

**Two lockfiles for one codebase.** `package-lock.json` recorded the frontend
dependencies and `bun.lock` did not exist, while the machine's other project
tree already ran on bun. The bundled license list in Settings was generated
from that npm lockfile.

**The CI workflows were written for npm host images.** Every workflow ran
`npm ci`, `npm audit` and `npm run …` through a `setup-node` step, which kept a
whole node runtime alive in CI for no reason.

## Change

- The package manager is bun, pinned at 1.4.0 in `mise.toml`, with `bun.lock`
  as the lockfile. `package.json` scripts are unchanged — they run under
  `bun run` — and vitest stays the test framework, run through bun.
- The three CI workflows use `oven-sh/setup-bun`, `bun install --frozen-lockfile`,
  `bunx`, `bun audit` and `bun` in place of every node/npm invocation.
- `src-tauri/tauri.conf.json` runs the dev and build hooks through `bun`.
- `src-tauri/licenses.rs` builds the bundled list from the *installed* frontend
  tree — the production closure of the root `package.json` walked through
  `node_modules` (pinned by `bun.lock`) — instead of parsing `package-lock.json`.
  It reaches the same two packages and re-reads the lockfile when bun changes it.
- `run_claude_job.sh` drops the nvm path from its `PATH`. The file is
  gitignored, so the scrub is a local change; the commit documents what it was.
- The docs that name npm are reconciled: `docs/ci.md`, `docs/testing.md`,
  `docs/screens.md` and `CONTRIBUTING.md`.

## What stays

- **The `npm:` key in the bundled license JSON.** Renaming it to `js:` would
  churn `about.rs`, the frontend types and the settings tests for no benefit —
  the schema is internal.
- **vitest as the framework.** It is what `flat.test.ts` read the stylesheets
  with and what the coverage figures are tied to; bun replaces the *runner*
  (install and the runtime the scripts execute under), not the tester.
- **`npm run`-era gate semantics.** `bun audit` exits clean, `bun run coverage`
  still enforces the 70% floor, and `bunx license-checker-rseidelsohn@4` still
  audits the production tree.

## Non-scope

- **Bumping frontend dependencies.** The lockfile changes because the format
  changes, not because versions move.
- **`tools/release-notes.mjs` and friends.** They run under `node` today only
  because npm shipped one; they now run under `bun tools/…` unchanged.
- **The `node` binary in others.** A machine without bun still falls back to
  whatever `PATH` provides; nothing here depends on that path existing.

## Acceptance criteria

- `bun run check`, `bun run test`, `bun run coverage` and `bun run build` all
  pass with no node on `PATH`, and `bun audit` exits 0.
- The Rust side is untouched in behaviour: `cargo check`, `cargo test --lib`,
  `cargo fmt` and `cargo clippy -D warnings` are clean.
- The generated license list still names exactly `@tauri-apps/api` and
  `@tauri-apps/plugin-dialog`, and `about::` tests pass.
- No `npm`, `npx` or `setup-node` reference remains in the workflows or the
  docs that describe them.

## Dependencies

Independent of the open pull requests: the workflows it touches are only
executed on push. `run_claude_job.sh`'s scrub depends on no other item.