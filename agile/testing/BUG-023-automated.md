<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-023 — Automated test record

**Item:** [`agile/items/BUG-023-a-record-test-reads-another-tests-clone.md`](../items/BUG-023-a-record-test-reads-another-tests-clone.md)

## What was tested

No test was added. The defect **is** a test, and what it needed was to stop
being wrong; a test asserting that another test's records do not interfere would
be a test of the test harness.

What was done instead is a measurement, twice.

**Before**, twelve runs of the three clone tests together:

```
$ for i in $(seq 1 12); do cargo test -q -p spagitty-core --lib shell::tests::a_clone; done
6 runs failed with: the URL stopped being recognisable: git clone … /tmp/.tmpzLSvFq …
```

**After**, six runs:

```
test result: ok. 3 passed; 0 failed   (×6)
```

## Test command and output

```
$ cargo test -p spagitty-core --lib shell::tests
test result: ok. 8 passed; 0 failed; 0 ignored; 494 filtered out

$ cargo fmt --all --check
(clean)
```

## What is not covered automatically

That no *future* test writes a clone to the record without taking the gate. The
second half of the fix — the reader matching its own entry — is what limits the
damage if one does.
