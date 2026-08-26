<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-018 — Four gates that have never seen this code

**Status:** Open on `task/TASK-018-first-ci-run`.
**Raised by:** a review of the repository against Amendment 16.

This was Backlog while there was no pull request for a gate to run on. The flow
is being repaired now — the branches are pushed, the stack is merged and one
pull request is open — so the first run is imminent and this item carries its
plan and testing documents.

## Problem

`docs/ci.md` says it plainly, and has since the workflows landed:

> **Not yet running.** The repository has no remote, so none of this has
> executed.

The repository has a remote now. The pipeline still has not run, because gates
1 to 4 fire on pull requests into `main` and `dev` and on pushes to them, and
there have been none since the rename. Gate 5 builds on macOS and Windows and
runs only on `main`.

So: every dependency licence, every clippy lint under `-D warnings`, the
coverage floor, `cargo deny` advisories, `npm audit`, the secret scan over the
whole history, and the macOS and Windows builds — none of them has been applied
to the current tree. The local checks that stand in for them cover Linux, and
they cover what the author remembers to run.

The two gates most likely to be red have never been exercised at all:

- **Gate 5**, the only thing that proves the application builds anywhere except
  this machine. Two of its three targets have never been attempted.
- **Gate 1**, which reads both dependency trees for licences. Every crate added
  since the rename — `ureq` and its TLS stack, the keychain crate — arrived
  without that check.

## Why this is its own item

The pipeline cannot run until there is a pull request, and there cannot be a
pull request until the flow is repaired. That is a different problem with
different decisions in it, and it is recorded separately — on a branch of its
own, so its identifier is written in here when the branches meet rather than
cited into a tree that cannot resolve it.

This item is what happens *after*: the first run is the work, not a formality.
`docs/ci.md` says as much — "treat the initial run as part of the work" — and a
first run of six gates over six months of unchecked code is not expected to be
green.

## Shape of the work

1. Let gates 1 to 4 run on the first pull request.
2. Read every failure, and fix each on its own branch with its own item. A red
   gate is fixed, not bypassed: Amendment 16 forbids `continue-on-error`, forbids
   re-running until it passes, and forbids a blanket allow in place of a recorded
   exception.
3. An advisory that genuinely cannot be fixed is recorded **by id** in
   `deny.toml` with its crate and its reason, the way TASK-010 did.
4. Only once 1 to 4 are green does gate 5 matter, and it needs `main` — so it
   follows the merge rather than preceding it.
5. `docs/ci.md`'s "Not yet running" paragraph is rewritten when it stops being
   true, and not before.

## What to expect, so a red gate is not read as a disaster

- **Gate 2** runs `cargo clippy --workspace --all-targets -- -D warnings`.
  Locally, clippy has been run per-crate. The workspace run over all targets is
  wider.
- **Gate 3** enforces 70% on both languages. The frontend figure is comfortably
  above it; Rust is measured with `cargo llvm-cov`, which has not been run
  recently.
- **Gate 4** scans the whole history with `gitleaks detect`. It found nothing
  the last time it ran locally, over 50 commits. There are more now.
- **Gate 5** is the unknown. A Tauri build on macOS and Windows, from a codebase
  developed only on Linux, is where the surprises will be.

## Non-scope

Repairing the flow so a pull request can exist. Changing what any gate checks —
the order and the contents of the gates are settled by Amendment 16 and by
`docs/ci.md`, and this item runs them rather than editing them.

## Dependencies

The flow-restore item, which has to land first. There is nothing for a gate to
run on until it does.
