<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-027 — Automated tests

**Item:** [`agile/items/TASK-027-migrate-the-js-toolchain-to-bun.md`](../items/TASK-027-migrate-the-js-toolchain-to-bun.md)

## What was tested

The suite changed not a line; the runner did. The proof that the swap did not
move the goalposts is the recorded battery run with only bun on `PATH`:

| Command | Result |
| --- | --- |
| `bun run check` | svelte-check: **0 errors, 0 warnings** |
| `bun run test` | vitest under bun: **77 files, 1914 tests passed** (incl. `tools/record.test.ts`, which re-checks the index↔tree contract) |
| `bun run coverage` | vitest coverage under bun: statements 86.21%, branches 75.05%, functions 82.45%, lines 85.82% — every figure above the `vite.config.ts` threshold of 70 |
| `bun run build` | frontend production build succeeds |
| `bun audit` | exit 0; one low-severity advisory (`cookie@0.6.0` via `@sveltejs/kit`) |
| `bunx license-checker-rseidelsohn@4` | exit 0; 2 production packages |
| `cargo test --workspace` | 533 passed (68 lib + 465 core) |
| `cargo test -p spagitty --lib about::` | 8 passed — the license assertion suite reads the generated JSON |
| `cargo llvm-cov --workspace --ignore-filename-regex '(fixture|testing)\.rs'` | lines **84.55%**, above the Amendment 10 floor of 70% |
| `cargo fmt --all`, `cargo clippy --workspace --all-targets -- -D warnings` | clean |

## The license list stayed the same

`licenses.rs` was rewritten — it now walks the installed production tree
(manifest `dependencies` + `optionalDependencies` through `node_modules`,
pinned by `bun.lock`) instead of parsing `package-lock.json`. The acceptance
criterion is that its output does not move:

```
npm:2 — two production packages:
  @tauri-apps/api 2.11.1        Apache-2.0 OR MIT
  @tauri-apps/plugin-dialog 2.7.2  MIT OR Apache-2.0
```

That is exactly the `dev:false` set the npm lockfile produced, and the `about::`
tests (which assert the list regenerates and names those two) pass on it. The
generated file lives at
`target/debug/build/spagitty-*/out/licenses.json` (`generated: true`, no notes).

## The dangerous browser is not touched

Nothing here renders. Vitest's jsdom mounts components for the existing suite,
but the workflows and the build are exercised headless, and the window itself
remains the human's (Amendment 4); see the sweep.

## Recorded run

```
bun run test
 Test Files  77 passed (77)
      Tests  1914 passed (1914)
```

## Coverage

Frontend coverage is *measured by the same vitest the scripts already ran*, so
the figures above are not new facts. Rust coverage is unchanged because no Rust
logic changed; `licenses.rs` is build-script code and sits outside the
denominator (Amendment 10), and no line of it is hit by the running binary.