<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-011 — Plan

## Approach

Replace the stub with a real screen in five sections, and build the two
obligations properly: the About section's build identity, and a dependency
licence list generated from the lockfiles.

- **`crates/spagitty-core/src/identity.rs`** — reading and writing `user.name`
  and `user.email`, per scope.
- **`src-tauri/src/settings.rs`** — the behaviour toggles, application state
  beside `recents.rs`.
- **`src-tauri/licenses.rs`** (a build-script module) — the licence list.

## Decisions

**Identity is read with `gix` and written with `git`.** That is the `shell.rs`
rule applied without an exception: `.git/config` and `~/.gitconfig` are state
the whole ecosystem reads, so writing them goes through `git config`. Reading
them does not.

**The scope is a parameter, never inferred.** Writing to the wrong scope is a
quiet mistake — a repository-local identity that silently became global is the
kind of thing found months later on somebody else's commits. So the screen asks
which, both values report which scope they came from, and there is no default.

**Clearing unsets the key.** `git config --unset`, not an empty string. An
empty `user.email` is a configured empty email, which git will happily commit
with; an unset one falls back to the next scope, which is what "clear" means.

**The licence list is generated at build time, without a new tool.** The plan
was `cargo-about`; it is not installed, and adding a required build tool to
every machine and every CI runner is a cost this can avoid. `cargo metadata`
ships with cargo and reads the lockfile, so the Rust half is a `cargo metadata`
call parsed with `serde_json` — which is already a dependency. The npm half is
`package-lock.json`, read the same way, falling back to each package's own
`package.json` for entries the lockfile does not carry a licence for.

**A missing licence list degrades, it does not fail the build.** A build script
that cannot run `cargo metadata`, or a checkout with no `node_modules`, still
produces a working application; the About section says the list was not
generated in this build and why. The degradation is itself tested, because an
untested fallback is a fallback that does not work.

**The About section keeps everything the footer had.** Version, commit,
licence, trademark notice. The GPL-3 obligation predates this screen and must
not regress while it is rebuilt — the values move into a section, they do not
disappear for a commit.

**Behaviour toggles persist beside the repository list.** Same directory, same
lenient-parse-or-default treatment, same reason: a hand-edited preferences file
must not stop the application starting.

**A toggle that does nothing yet says so.** "Sign my commits" and "Ask before
rewriting history" have no code behind them until the screens that would honour
them exist. They persist, and each says which item will make it take effect.
Criterion 4 asks that toggles "take effect where they are claimed to" — so the
claim is narrowed to the truth rather than the truth stretched to the claim.

**Nothing here needs an open repository.** Identity falls back to global scope
alone, and Appearance, Accounts and About never needed one.

## Files

- `crates/spagitty-core/src/identity.rs` — new; `shell.rs` gains
  `set_config` / `unset_config`; `lib.rs`
- `src-tauri/build.rs`, `src-tauri/licenses.rs` — new build-script module
- `src-tauri/src/settings.rs` — new; `commands.rs`, `lib.rs`
- `src/lib/types.ts`, `src/lib/api.ts`
- `src/lib/settings/` — a component per section
- `src/routes/settings/+page.svelte` — replaces the stub, keeps the About
  content

## Risks

- **`cargo metadata` lists build and dev dependencies too**, which are not
  distributed. The list is filtered to what is actually linked, and says which
  it is showing.
- **A licence field can be absent or non-SPDX.** Those entries are listed as
  "not declared" rather than omitted; an incomplete list that looks complete is
  worse than one that admits a gap.
- **Writing git config touches the user's real configuration.** Tests write
  only inside fixture repositories with `HOME` pointed at the fixture, which the
  fixture helper already does.

## Rollback

Revert the commit. Settings returns to its stub with the About footer, which is
the state the GPL obligation was already met in.
