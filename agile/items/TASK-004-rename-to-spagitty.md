<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-004 — Rename the project from GitLord to Spagitty

**Status:** Done, record backfilled
**Branch:** none — landed directly on `main` as `994dbe9`

## Problem

The project shipped its whole first arc under the name GitLord. The name changed
to **Spagitty**, and a name in a Tauri project is not a string in one file: it
is the workspace crate name, the Rust package and library names, the Tauri
product name and bundle identifier, the npm package, the capability manifest,
the license and attribution headers, every `localStorage` key, every user-facing
label, and every mention across `docs/` and `agile/`. Leaving any of them behind
would mean two names in one product, and a bundle identifier that disagrees with
the product is a different application to the operating system.

## Scope

- `crates/gitlord-core` → `crates/spagitty-core`, and every dependant.
- Rust crate, package, and library names, including `spagitty_lib`.
- `src-tauri/tauri.conf.json`: `productName` Spagitty, `identifier`
  `dev.spagitty.app`; `capabilities/default.json` and the generated schema.
- `package.json` / `package-lock.json` name.
- Persisted keys: `gitlord.scale.*` → `spagitty.scale.*` and the equivalents
  in the settings, recents, and workspace stores.
- User-facing strings: title bar, About, notices, window class.
- CI: `.github/workflows/gates.yml`, `prerelease.yml`, `actions/linux-deps`.
- Prose: `README.md`, `CONTRIBUTING.md`, `NOTICE`, `deny.toml`, all of `docs/`
  and all of `agile/`.

180 files in total.

## Non-scope

- The repository directory on disk and the git remote path. The clone still sits
  at `~/Dev/mywrok/gitlord` and the remote is `Spagitty/spagitty`; neither
  affects the built product.
- Migrating existing users' persisted state from the old key names. This is a
  pre-release application with no shipped users; a migration shim would be code
  written for nobody. Recorded here so it is a decision rather than an
  oversight — anyone who ran a development build loses their zoom, text size,
  and recent-repository list once.
- The `design_handoff_gitlord/` bundle, which keeps the old name because it is a
  historical artifact of the design handoff, not a source of the product.

## Acceptance criteria

- No occurrence of `gitlord` (any case) in any tracked source, config, workflow,
  manifest, or document.
- `cargo build`, `cargo test --workspace`, `npm run check`, and `npm test` all
  pass against the renamed crate.
- The bundle identifier and product name agree, and the capability manifest
  refers to the renamed application.

## Verification of the acceptance criteria

`grep -rIi gitlord` over the working tree, excluding `.git`, `node_modules`,
`target`, `.svelte-kit`, `build`, `coverage`, and `design_handoff_gitlord`,
returns only `.idea/` — untracked JetBrains project files, now git-ignored by
BUG-005. Every gate passes; see `TASK-004-automated.md`.

## Dependencies

None. It touches every item's files but changes no item's behaviour.
