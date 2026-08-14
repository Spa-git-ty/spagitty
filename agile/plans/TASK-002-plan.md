<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-002 — Plan

## Approach

Four pieces, in this order, because each one makes the next measurable.

1. **A frontend test runner.** Vitest with `@vitest/coverage-v8`, configured in
   `vite.config.ts` so it shares the SvelteKit plugin and the `$lib` alias
   rather than growing a second build configuration.
2. **A Rust fixture.** `tempfile` plus `crates/gitlord-core/src/fixture.rs`,
   which builds real repositories with the `git` binary.
3. **Tests**, prioritised by what can be wrong rather than by what is easy.
4. **Gates and their documentation**, once there is something for gate 3 to
   measure.

## Decisions

**Tests run against happy-dom, not node, and components are mounted for real.**
The components are half the frontend and hold the behaviour a user actually
meets — a click reaching its handler, a key moving a selection, a disabled
control staying disabled. Testing only the `.ts` files would have left coverage
around 50% and, worse, left the interactive parts unchecked. Mounting needs a
DOM, so the whole suite carries one rather than the run being split in two.

*Alternative rejected:* excluding `.svelte` files from the coverage denominator
to reach the floor. That is exactly the padding Amendment 10 forbids, in
reverse — hiding untested code instead of adding meaningless tests.

**Fixtures are built with the `git` binary, not with `gix`.** A fixture built by
the library under test agrees with it by construction: a bug in how refs are
written would produce a repository only our own reader understands. Every
fixture lives in a temporary directory and is removed with it.

**Store stubs for component tests are reactive and live outside `src/lib`.**
A stub built from plain properties renders once and never updates, so every test
about a change would pass by rendering the initial value. They are `.svelte.ts`
files under `src/testing/` — outside the coverage denominator, because they are
scaffolding rather than product.

**`rustfmt` is applied rather than configured around.** The existing code was
inconsistent — `diff.rs` was already rustfmt-clean, the older modules were not.
Adding a `rustfmt.toml` to preserve the older style would have frozen an
inconsistency; running `cargo fmt --all` once is mechanical and settles it.

**One clippy failure was a real finding.** `examples/graph-dump.rs` passed a
literal as a format argument. Fixed in place; it changes no behaviour.

**The Tauri layer is left untested, deliberately and on the record.** Everything
in `src-tauri` that touches the app takes a concrete `AppHandle`, which
`mock_app` cannot supply. Making it generic over `Runtime` is a refactor across
the whole layer — recorded as TASK-003 rather than smuggled into a testing item.
The pure, load-bearing parts of `watch.rs` are tested regardless.

## Files

- `package.json`, `vite.config.ts` — runner, scripts, coverage thresholds
- `src/testing/{mount.ts,graph-store.svelte.ts,repo-store.svelte.ts}`
- `src/lib/**/*.test.ts` — one file per unit, or one per closely-related pair
- `crates/gitlord-core/Cargo.toml`, `src/fixture.rs`, `src/lib.rs`
- Test modules appended to `repo.rs`, `refs.rs`, `status.rs`, `graph.rs`,
  `diff.rs`, `shell.rs`, `src-tauri/src/watch.rs`
- `crates/gitlord-core/examples/graph-dump.rs` — the clippy fix
- `deny.toml`, `.github/workflows/{gates,prerelease}.yml`,
  `.github/actions/linux-deps/action.yml`
- `docs/ci.md`, and the CI reference in `docs/architecture.md`

## Risks

- **The workflows have never run.** There is no remote. They are written from
  the documented behaviour of each action, and the first push is the first real
  test of them. `docs/ci.md` says so rather than implying they are proven.
- **`npm audit` and the advisory database change under the pipeline**, so gate 4
  can fail on a day nothing was committed. That is the gate working; the fix is
  to update the dependency, not to lower the threshold.

## Rollback

Revert the commit. Nothing in the application imports anything added here; the
only non-test changes are `cargo fmt` output and the one clippy fix.
