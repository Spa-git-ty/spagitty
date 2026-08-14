<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-002 — Test and CI baseline

**Status:** Done.
**Branch:** `task/TASK-002-test-and-ci-baseline`.

## Problem

Two of the repository's obligations are unmet and both block the screens ahead.

Amendment 10 sets a floor of 70% coverage of first-party code. Coverage is
currently unmeasured: there is no coverage tool for the Rust crates, and the
frontend — roughly half the codebase, and the half where the stores hold the
logic most likely to be wrong — has no test runner at all.

Amendment 16 requires a CI pipeline of six ordered gates. There is no pipeline
and no `.github/` directory.

Separately, `cargo fmt --check` and `cargo clippy -D warnings` both fail on code
that predates this work, so gate 2 cannot pass until they are made clean.

## Motivation

Ten screens are about to be written. Every one of them will add a store and a
core module, and adding the machinery afterwards means writing thirty test files
in a batch against code nobody remembers the edges of.

## Scope

- Vitest with `@vitest/coverage-v8`, configured over `src/lib/**`, with an
  `npm test` script; `svelte-check` stays as it is.
- Tests for the pure frontend logic that exists: `format.ts`, `metrics.ts`,
  `nav.ts`, `graph/lanes.ts`, `diff/split.ts`, and the Diff store with `$lib/api`
  mocked.
- `cargo-llvm-cov` for the Rust crates, with the command recorded in `docs/ci.md`.
- A `tempfile` dev-dependency and a shared fixture helper that builds a real
  repository with the `git` binary, so core modules that need one can be tested.
- Tests using that fixture for the untested reads that already exist:
  `graph::walk`, `refs::RefIndex::build`, `repo::info`, `repo::head`,
  `status::counts`, `diff::commit_diff`, `diff::file_diff`.
- `rustfmt` and `clippy` made clean across the workspace.
- The six Amendment 16 gates as CI workflows, plus `docs/ci.md` describing what
  each gate runs and which branch triggers it.

## Non-scope

- End-to-end or webview-driving tests. The manual sweeps cover that ground for
  now.
- Changing any runtime behaviour. Formatting and lint fixes are mechanical; if
  a clippy fix would change behaviour, it is left alone and recorded instead.
- Making the pipeline run. There is no remote yet, so the workflows land unused.

## Acceptance criteria

1. `npm test` runs the frontend suite; `npm run test -- --coverage` prints a
   figure for `src/lib/**`.
2. `cargo llvm-cov --workspace` prints a figure for the Rust crates.
3. Both figures are recorded in `TASK-002-automated.md` against the 70% floor.
4. `cargo fmt --check` and `cargo clippy --workspace --all-targets -- -D warnings`
   both pass.
5. Workflows exist for all six gates, in the Amendment 16 order, with `main`
   running all six and `dev` stopping after gate 4.
6. `docs/ci.md` describes each gate, its tool, and its trigger.
7. Tests assert on behaviour. No test exists only to execute a line.

## Dependencies

FEAT-002 (its `split.ts` and store are among the first things tested).
