<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-008 — Automated tests

**Item:** [`agile/items/TASK-008-branches-footer.md`](../items/TASK-008-branches-footer.md)
**Run:** `npx vitest run` — 1021 tests, 55 files, all passing.

## No tests were added, and that is deliberate

This item removes one sentence from a route component. The suite does not mount
route components, so the only assertion available would be grepping the source
for the absence of a string — which passes whether or not the interface is
correct, and would keep passing if the sentence came back through a store or a
constant.

Amendment 10 calls a test that executes code without asserting on it padding.
A test that cannot fail is worse. The verification is `TASK-008-T1` and `T2` in
the manual sweep.

## What the existing suite proves

`src/lib/branches/BranchTable.test.ts:162` still asserts the Delete chip renders
with its reason. That is where the information now lives, so it is the assertion
that matters — and it passes unmodified.

## Coverage

Unchanged: 1021 tests, all four metrics over the Amendment 10 floor. This item
removes markup and adds no first-party branches.
