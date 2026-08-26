<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-018 — Plan

**Item:** [`agile/items/TASK-018-first-ci-run.md`](../items/TASK-018-first-ci-run.md)

## Approach

Run the gates locally first, then let the real ones run, then fix what they
find. A first run of six months of unchecked code is not expected to be green,
and the cheapest place to discover that is on this machine rather than on a
runner.

The order is Amendment 16's order, and it is not negotiable: a gate that fails
stops everything downstream, so nothing is learned about gate 3 by ignoring a
red gate 2.

## Step 1 — the local stand-ins

Each gate's commands are lifted out of `.github/workflows/gates.yml` so the
local run and the runner disagree about as little as possible.

| Gate | Locally |
| --- | --- |
| 1 licenses | `cargo deny check licenses bans sources`; `npx license-checker-rseidelsohn@4 --production --onlyAllow "…" --excludePrivatePackages` with the workflow's exact allow-list; the file checks on `LICENSE`, `NOTICE` and the two manifests |
| 2 quality | `cargo fmt --all --check`; `cargo clippy --workspace --all-targets -- -D warnings`; `npm run check` |
| 3 tests | `cargo llvm-cov --workspace --ignore-filename-regex '(fixture\|testing)\.rs' --fail-under-lines 70 --summary-only`; `npm run coverage` |
| 4 security | `cargo deny check advisories`; `npm audit --audit-level=high`; `gitleaks detect --source . --redact --verbose --exit-code 1` |

Two of these tools are not installed on this machine and are installed as part
of this step: `cargo-llvm-cov` and the `gitleaks` binary. `cargo-deny` is
already here at 0.20.2.

**What is expected to be red, and why it is not a disaster.**

- **Gate 2** is the widest. Clippy has only ever been run per-crate here; the
  gate runs `--workspace --all-targets` with `-D warnings`, which reaches test
  code and examples that have never been linted.
- **Gate 3**'s Rust half is measured with `cargo llvm-cov`, which has not been
  run recently. The frontend half is comfortably above the floor.
- **Gate 1** reads both dependency trees for licences. Every crate added since
  the rename — the HTTP client and its TLS stack, the keychain crate — arrived
  without that check.
- **Gate 4** scans the whole history rather than a diff, and the history is
  longer than the last time it ran.

**Gate 5 is not run locally.** It builds on macOS and Windows, which this
machine is not, and it runs only on `main`. It is out of scope here.

## Step 2 — fix each red, on its own branch

Amendment 16 is explicit about what is not allowed, and each is worth naming
because each is the tempting shortcut:

- No `continue-on-error`, and no removing a step to get a merge through.
- No re-running until it passes.
- No blanket `allow` in place of a recorded exception.

An advisory that genuinely cannot be fixed is recorded **by id** in `deny.toml`,
with its crate and the reason, the way the earlier advisories item did it. Every
fix is its own work item with its own branch and its own triplet, because a fix
that rides along in this item is a fix nobody can find later.

## Step 3 — the real run

The pull request into `dev` fires gates 1 to 4. Read them with `gh pr checks`
and `gh run view --log-failed`, and treat what the runner finds that the local
stand-ins did not as the interesting part: a difference between the two is a
fact about the pipeline, and it belongs in `docs/ci.md`.

## Step 4 — the paragraph that stops being true

`docs/ci.md` opens with:

> **Not yet running.** The repository has no remote, so none of this has
> executed.

It is rewritten once the gates have actually run, and not before. Rewriting it
in advance would make the document a claim rather than a record, which is the
class of drift the documents item was raised for.

## Non-scope

- Repairing the flow so that a pull request can exist. That is its own item and
  it lands first.
- Changing what any gate checks. The order and the contents are settled by
  Amendment 16 and by `docs/ci.md`; this item runs them.
- Gate 5 and gate 6. They need `main`, and `main` is the author's.

## Risks

- **A red gate that is really a bad gate.** Six workflows written against a
  repository that had no remote have never been executed once; a step can be
  wrong in a way that no reading catches. The response is the same as for any
  other red: fix it on a branch, with an item, and say in `docs/ci.md` what was
  wrong.
- **A long tail.** Gate 2 over a workspace that has only been linted per-crate
  could produce a lot of warnings. They are mechanical, and they are fixed
  rather than silenced.
- **A secret in the history.** `gitleaks detect` walks every commit. If it finds
  something real, this stops being a tidy-up: the secret is rotated first and
  the finding is handled as a security matter, not as a failing check.

## Rollback

Nothing here is destructive. The local runs are read-only; every fix is an
ordinary commit on its own branch; `docs/ci.md` is edited last and only once the
run has happened.
