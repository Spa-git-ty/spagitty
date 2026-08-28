<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-004 — Plan

*Backfilled after the fact. This records the approach the change actually took,
not a proposal; where the executed work diverged from what the approach implies,
BUG-005 carries the correction.*

## Decisions

**A rename, not a fork of the name.** `git mv` on the crate directory, so the
history of every file in `crates/gitlord-core` follows it to
`crates/spagitty-core` rather than appearing as 20 deletions and 20 creations.
`git show --stat` confirms it: every file in the crate is recorded as a rename
with a similarity index, and only the files that genuinely changed carry a diff.

**The identifier changes with the name.** `dev.gitlord.app` →
`dev.spagitty.app`. This is the one part of the rename with a user-visible
consequence — the OS treats it as a new application, so it gets a fresh app-data
directory and the old one is orphaned. Accepted, because a bundle identifier
carrying a name the product no longer has is worse: it surfaces in the installed
application list, in the settings store path, and in every future signing
decision.

**Persisted keys change with it too**, for the same reason and with the same
cost. See the non-scope note in the item.

**Prose is rewritten, not search-and-replaced blindly.** `agile/` and `docs/`
are a historical record; sentences that read "GitLord was measured against
GitKraken" become "Spagitty was measured against GitKraken", because the
subject is the product and the product is what was renamed.

## Files

| Area | Change |
| --- | --- |
| `crates/gitlord-core/` → `crates/spagitty-core/` | Directory rename; `Cargo.toml` package name; `lib.rs` header |
| `Cargo.toml`, `Cargo.lock` | Workspace members, workspace dependency, repository URL, authors |
| `src-tauri/` | `Cargo.toml`, `build.rs`, `tauri.conf.json`, `capabilities/default.json`, `gen/schemas/`, and every `use gitlord_core::` |
| `src/` | Imports, storage keys, user-facing labels, `app.html` title |
| `.github/` | Workflow names, artifact names, the Linux deps action |
| Prose | `README.md`, `CONTRIBUTING.md`, `NOTICE`, `deny.toml`, `docs/**`, `agile/**` |

## Risk

- **A missed occurrence compiles fine.** Rust catches a stale `gitlord_core`
  import, but a stale string in a workflow, a manifest, or a document does not
  fail anything. Mitigated by a repository-wide case-insensitive grep as the
  acceptance check rather than by the compiler.
- **`Cargo.lock` and `package-lock.json` must move with the manifests**, or CI
  installs a package that no longer exists. Both are in the commit.
- **The generated Tauri schema** under `src-tauri/gen/schemas/` is checked in and
  carries the identifier; regenerating it later with a stale manifest would
  reintroduce the old name.

## Rollback

Revert `994dbe9`. It is a single commit and touches nothing else, so the revert
is mechanical — but it also reverts the presentation work in FEAT-029, which
rode the same commit. That coupling is itself a defect of how the work landed;
see BUG-005.
