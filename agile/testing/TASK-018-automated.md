<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-018 — Automated tests

**Item:** [`agile/items/TASK-018-first-ci-run.md`](../items/TASK-018-first-ci-run.md)

## The gates are the test

This item writes no source line and adds no test. It runs the pipeline for the
first time, so the recorded run below **is** the deliverable: a gate's result is
the assertion, and a gate that has never executed has never asserted anything.

Amendment 16's order is what makes the record readable. A gate that fails stops
everything downstream, so a blank result under a red gate means "never reached",
not "passed".

## Local stand-ins — recorded run

Run on the integration branch, `task/TASK-017-flow-restore`, before the pull
request was opened. Each command is the one `.github/workflows/gates.yml` runs,
so a difference between these results and the runner's is a fact about the
pipeline rather than about the code.

**All four passed.** That was not the expectation — the item says a first run of
six months of unchecked code is not expected to be green — and it is worth being
precise about why it happened rather than treating it as luck: the gates were
written alongside the code they gate, and the per-crate and per-package checks
they wrap have been run locally throughout. What had never been run was the
*workspace-wide* form of them, which is what these commands are.

### Gate 1 · licenses

```
$ test -f LICENSE && test -f NOTICE
$ grep -q "GPL-3.0-or-later" package.json
$ grep -q "GPL-3.0-or-later" Cargo.toml
ok

$ cargo deny check licenses bans sources
bans ok, licenses ok, sources ok

$ npx license-checker-rseidelsohn@4 --production --onlyAllow "…" --excludePrivatePackages
exit 0
```

`cargo deny` emitted three `license-not-encountered` warnings — `BSD-2-Clause`,
`BSL-1.0` and `Unicode-DFS-2016` are allowed in `deny.toml` and no dependency
uses them. Warnings, not failures, and they are left alone: an allow-list
trimmed to exactly today's tree fails the next time a dependency changes.

### Gate 2 · code quality

```
$ cargo fmt --all --check
exit 0

$ cargo clippy --workspace --all-targets -- -D warnings
Finished `dev` profile

$ npm run check
1039 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS
```

The workspace-wide clippy run over all targets is the one that had never
happened. It is clean.

### Gate 3 · tests and coverage

```
$ cargo llvm-cov --workspace --ignore-filename-regex '(fixture|testing)\.rs' --fail-under-lines 70 --summary-only
TOTAL  regions 84.72%  functions 76.36%  lines 82.92%
exit 0

$ npm run coverage
Statements   : 85.98% ( 6211/7223 )
Branches     : 74.58% ( 2031/2723 )
Functions    : 82.19% ( 1620/1971 )
Lines        : 85.70% ( 4370/5099 )
```

Both languages are over the Amendment 10 floor of 70%. The Rust figure is the
one that had not been measured recently; `cargo-llvm-cov` was installed for this
run.

### Gate 4 · security

```
$ cargo deny check advisories
advisories ok

$ npm audit --audit-level=high
3 low severity vulnerabilities
exit 0

$ gitleaks detect --source . --redact --verbose --exit-code 1
125 commits scanned.
no leaks found
exit 0
```

The three npm advisories are `cookie` reached through `@sveltejs/kit` and
`@sveltejs/adapter-static`. All three are **low**, the gate's threshold is
`high`, and they are development dependencies rather than anything that ships.
They are recorded here rather than silenced, and they are not an exception under
`deny.toml` — that file governs the Rust tree.

`gitleaks` walked the whole history: 125 commits, 5.44 MB, nothing found. That
is the first time the scan has actually run over this repository — the earlier
attempt failed on the action's licence check rather than on anything it read.

## The real run — recorded result

Filled in from the pull request, per gate, with the run's own identifier so it
can be found again.

| Gate | Result | What it found |
| --- | --- | --- |
| 1 licenses | | |
| 2 code quality | | |
| 3 tests and coverage | | |
| 4 security | | |
| 5 build | not reached — `main` only | |
| 6 release | not reached — `main` only | |

## What each red produced

One row per failure, naming the item and branch it was fixed on. A red with no
row here is a red that was bypassed, which Amendment 16 forbids.

| Gate | Failure | Fixed by |
| --- | --- | --- |

## Coverage — Amendment 10

Gate 3 enforces the 70% floor on both languages, and its output is the
authoritative figure for this item — the frontend from `npm run coverage`
against the thresholds in `vite.config.ts`, the Rust from
`cargo llvm-cov --fail-under-lines`. Both are recorded above rather than
restated here, so there is one number and not two.

## What is not tested here, and why

Gates 5 and 6. Both are `main`-only, `main` is the author's alone, and a build
on macOS and Windows cannot be stood in for on this machine. The first time
either runs will be the author's merge, and whatever it finds is a new item.
