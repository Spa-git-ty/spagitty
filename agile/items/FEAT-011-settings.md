<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-011 — Settings (1K)

**Status:** Done. Plan in `agile/plans/FEAT-011-plan.md`, tests in
`agile/testing/FEAT-011-automated.md` and `-sweep.md`.
**Branch:** `feature/FEAT-011-settings`.
**Route:** `/settings`. **Rail:** "Settings".

## Problem

Settings is half a screen: a `ScreenStub` describing what it will be, with a
real About footer bolted underneath because the GPL-3 obligations could not
wait. There is nowhere to set an identity, change behaviour, or read the
licenses of what this binary is made of.

## Motivation

Two of the sections are obligations rather than conveniences. The About section
has to name the exact commit this binary was built from, and the license list
has to be complete and accurate. Doing that properly is worth its own item.

## Scope

- A chip index across sections: You, Accounts, Behaviour, Appearance, Advanced.
- **You**: name and email, read from and written to git config. Global and
  repository-local are distinguished, because writing to the wrong one is a
  quiet mistake.
- **Behaviour**: sign my commits, ask before rewriting history, show the git
  command behind each action — persisted in the app-config directory.
- **Appearance**: theme, replacing the temporary chip in the stub's header.
- **Accounts**: the empty state FEAT-010 points at, explaining that no host is
  connected and that connecting one is not built yet.
- **Advanced → About**: version, the commit stamped in at build time, the
  license, and the full dependency license list.

## Non-scope

- Connecting an account, storing a token or an ssh key. That is FEAT-017, and
  nothing here writes to the OS keychain.
- Editing arbitrary git config keys. Only the ones the screen names.
- Per-repository behaviour overrides.

## Acceptance criteria

1. Identity read matches `git config user.name` / `user.email`, and the screen
   says which scope each value came from.
2. Writing identity produces exactly what `git config --global` or
   `git config --local` would, and never writes to a scope the user did not
   choose.
3. Clearing a value unsets the key rather than writing an empty string.
4. Behaviour toggles persist across a restart and take effect where they are
   claimed to.
5. The About section's commit matches `git rev-parse HEAD` of the source the
   binary was built from.
6. The dependency license list is generated from the lockfiles, not hand-typed,
   and covers both the Rust and the npm trees.
7. The trademark notice and the license statement stay visible, as they are in
   the current footer.
8. Nothing in this screen requires a repository to be open.

## Dependencies

FEAT-001 (the About footer this replaces), FEAT-010 (the Accounts empty state it
is linked from).
