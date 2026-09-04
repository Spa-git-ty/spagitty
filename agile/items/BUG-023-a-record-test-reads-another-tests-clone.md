<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-023 — A record test reads another test's clone

**Status:** Fixed, awaiting sweep
**Branch:** `bugfix/BUG-023-clone-record-test-picks-another-tests-clone`
**Screens:** none. It is a test, and it fails the pipeline.

## Problem

Gate 3 failed on a pull request that changes nothing in `spagitty-core`:

```
---- shell::tests::a_clone_is_recorded_at_spawn_with_its_credentials_removed stdout ----
thread '…' panicked at crates/spagitty-core/src/shell.rs:1393:9:
the URL stopped being recognisable: git clone --progress --recurse-submodules -- /tmp/.tmpzLSvFq /tmp/.tmpV6eY0R/project
```

Read the line it printed: there are no credentials in it because **it is not
that test's clone**. It is one of the other two clone tests in the same module,
which clone a local fixture path.

The record is process-wide. The test that reads it takes `record::test_gate()`,
but `a_clone_produces_the_same_repository_git_clone_would` and
`a_clone_reports_progress_on_stderr_rather_than_running_silently` do not — and
both call `clone_start`, which writes a record entry at spawn. Tests run in
parallel, so one of them can write its entry between the reader's `before` mark
and its own spawn, and `find(argv[1] == "clone")` takes whichever came first.

It fails perhaps half the time when the three run together, and almost never
when the suite is run one file at a time — which is why it has been passing
locally and failed once in nine CI runs.

## Reproduction

```
$ cargo test -p spagitty-core --lib shell::tests::a_clone
```

Run twelve times against the code before this change: **six failures**, with the
message above. After it: none in six.

## Scope

- The two clone tests that write to the record take the gate.
- The test that reads the record identifies **its own** entry, by the host in
  its URL, rather than the next clone it finds.

## Non-scope

- **Making the record per-thread or injectable in tests.** That is the
  structural fix and a much larger one: `record` is a process-wide ring by
  design, because it is what the "show the git command behind each action"
  feature reads. Worth doing if a third test ever needs it.
- The other three tests that already take the gate. They were right.

## Acceptance criteria

- The three clone tests pass repeatedly when run together.
- The reader's assertion cannot pass or fail because of an entry it did not
  produce.
