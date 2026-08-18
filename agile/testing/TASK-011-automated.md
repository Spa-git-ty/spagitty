<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-011 — Automated tests

**Item:** [`agile/items/TASK-011-secret-scanning-never-ran.md`](../items/TASK-011-secret-scanning-never-ran.md)
**File:** `.github/workflows/gates.yml`, gate 4.

*Backfilled by TASK-013.*

## The test is the gate

This item has no unit tests, and adding one would be theatre: there is nothing
to unit-test in a workflow step, and a test that asserted the YAML contained a
string would fail on every legitimate edit while proving nothing about whether
the scanner runs.

What the item ships **is** an automated check — gate 4's last step, over the
whole history, on every push and pull request:

```
./gitleaks detect --source . --redact --verbose --exit-code 1
```

`--exit-code 1` is the part that makes it a gate rather than a report.

## Evidence it runs

The scanner was run locally across the full history before the change was
committed, because CI could not be run locally and "it should work" is what the
licensed action also looked like:

```
50 commits scanned.
scanned ~3090906 bytes (3.09 MB) in 360ms
no leaks found
```

Since then it runs in CI on every pipeline that reaches gate 4.

## How this is verified when it is doubted

By committing a fake secret to a scratch branch and watching the gate go red —
`TASK-011-T2` in the sweep. That is the only assertion that distinguishes a
scanner that runs from a step that exits zero, which is exactly the failure this
item existed to fix, and it is deliberately a manual act rather than something
the pipeline does to itself.

## A note for whoever reads the gate log

`cmd | tail -3 && echo ok` prints "ok" over its own failure, because the
pipeline's exit status is `tail`'s. Every gate step runs on its own line for that
reason. Do not verify this gate — or any other — through a pipe.
