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

Run on the integration branch before the pull request. Each command is the one
`.github/workflows/gates.yml` runs, so a difference between these results and
the runner's is a fact about the pipeline rather than about the code.

### Gate 1 · licenses

```
$ cargo deny check licenses bans sources

$ npx license-checker-rseidelsohn@4 --production --onlyAllow "…" --excludePrivatePackages
```

### Gate 2 · code quality

```
$ cargo fmt --all --check

$ cargo clippy --workspace --all-targets -- -D warnings

$ npm run check
```

### Gate 3 · tests and coverage

```
$ cargo llvm-cov --workspace --ignore-filename-regex '(fixture|testing)\.rs' --fail-under-lines 70 --summary-only

$ npm run coverage
```

### Gate 4 · security

```
$ cargo deny check advisories

$ npm audit --audit-level=high

$ gitleaks detect --source . --redact --verbose --exit-code 1
```

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
