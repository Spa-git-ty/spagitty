<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-040 — Automated tests

**Item:** [`agile/items/FEAT-040-graph-footer.md`](../items/FEAT-040-graph-footer.md)
**Plan:** [`agile/plans/FEAT-040-plan.md`](../plans/FEAT-040-plan.md)

## What was written

| Test | Layer | What it asserts |
| --- | --- | --- |
| `a_repository_that_has_never_been_fetched_has_no_fetch_time` | `crates/gitlumiere-core/src/repo.rs` | An empty fixture has no `.git/FETCH_HEAD`; `last_fetched` is `None`, and so is `info().last_fetched`. The never-fetched case is a value, not an accident. |
| `a_fetch_head_dates_the_last_fetch` | `crates/gitlumiere-core/src/repo.rs` | With `FETCH_HEAD` written a moment ago, the stamp is within a minute of now in either direction, and `info()` carries the same number. The file is written *empty* on purpose — the contents are not the answer, the mtime is. |
| `dates the walk when it completes` | `src/lib/graph/store.test.ts` | `graph.refreshedAt` is null while rows arrive and is set, no earlier than the moment the test started, when a `complete: true` done payload lands. |
| `does not date a walk that was cancelled` | `src/lib/graph/store.test.ts` | A done payload with `complete: false` leaves `refreshedAt` null. A walk that did not finish refreshed nothing. |
| `no longer explains the screen to the person using it` | `src/lib/graph/store.test.ts` | The footer's markup mentions neither dragging a branch, nor right-clicking a row, nor double-clicking one. |
| `says how much is changed, when it refreshed, and when it was fetched` | `src/lib/graph/store.test.ts` | The three facts are all in the footer. |
| `has a word for a repository that has never been fetched` | `src/lib/graph/store.test.ts` | `never fetched` appears in the screen — the acceptance criterion that forbids an empty or invented time. |
| `has a word for a working copy that has not been read` | `src/lib/graph/store.test.ts` | `working copy not read yet`, for `counts.working === null`. |

The four footer assertions read `src/routes/+page.svelte` as text rather than
mounting it. A route is not a component this suite mounts, and the alternative —
extracting the footer into a component so it could be mounted — would be a
structure invented for the test rather than for the screen. The cost is honest
and worth naming: these assertions track *strings*, so rewording the footer
means editing them. They are pinned to the words the item asks for, not to
incidental copy.

## What no test here proves

That the mtime of `.git/FETCH_HEAD` really moves when, and only when, a fetch
happens. The Rust tests write that file themselves, which proves the read and
not the premise. git's behaviour is the premise, and the sweep — FEAT-040-T4 and
FEAT-040-T5 — is where a person checks it against a real remote, including the
fetch that brings nothing down.

Also untested automatically: that the footer's changed-file count and the
Working copy screen's count can never disagree. Structurally they are the same
`repo.counts.working`, which is the argument; the sweep checks it against the
rail and the screen anyway, because "same source" is only true until someone
adds a second source.

## Run

Gates 1 to 4 run locally on `1e093a4` plus this branch's documents, each
command on its own line with its exit status read rather than piped:

| Gate | Command | Result |
| --- | --- | --- |
| 1 licenses | `cargo deny check licenses` | `licenses ok` |
| 2 code quality | `cargo fmt --all --check` | Failed once on `last_fetched`'s method chain — the read landed unformatted. `cargo fmt --all` fixed it; clean since. |
| 2 code quality | `cargo clippy --all-targets --all-features -- -D warnings` | Clean. |
| 2 code quality | `npm run check` | Clean. |
| 3 tests | `cargo test --workspace` | 320 passing — 282 in `gitlumiere-core`, 38 in `src-tauri`. |
| 3 tests | `npm run coverage` | 1338 passing across 56 files. |
| 3 coverage | `cargo llvm-cov --workspace --ignore-filename-regex 'fixture\.rs' --fail-under-lines 70` | Lines 81.17%, regions 82.26%, functions executed 72.60%. Over the floor. |
| 3 coverage | `npm run coverage` thresholds | Statements 86.97%, branches 72.83%, functions 83.98%, lines 86.11%. All four over the Amendment 10 floor of 70%. |
| 4 security | `cargo deny check advisories` | `advisories ok` |
| 4 security | `npm audit --audit-level=high` | Clean at the gate's level. |
| 4 security | `gitleaks detect --source . --redact --verbose --exit-code 1` | 65 commits scanned, no leaks found. |

Gates 5 and 6 are not run on a branch: `.github/workflows/gates.yml` stops after
gate 4 on anything that is not `main`, and the release build is triggered by a
merge into `main` under Amendment 15.

### The touched code specifically

`crates/gitlumiere-core/src/repo.rs` — lines 96.17%, regions 97.14%, functions
90.91%.
`src/lib/graph/store.svelte.ts` — statements 95.41%, branches 95%, functions
92.30%, lines 94.95%.

`src/routes/+page.svelte` is a route and is not instrumented by the frontend
suite; the footer is covered by the source assertions above and by the sweep.
