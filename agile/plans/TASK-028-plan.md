<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-028 — Implementation plan

**Item:** [`agile/items/TASK-028-reconcile-working-record-and-docs.md`](../items/TASK-028-reconcile-working-record-and-docs.md)

## Approach

Reconcile the working record in `agile/` with the current branch and repository
state by updating the item statuses and the index table in `agile/README.md`.

## Touched files

- `agile/items/FEAT-059-pull-request-review-workspace.md`
- `agile/items/FEAT-060-spagitty-brand.md`
- `agile/items/TASK-024-the-glass-reads-as-glass.md`
- `agile/items/TASK-025-release-lane-amendment-20.md`
- `agile/items/TASK-026-remove-every-remaining-shadow.md`
- `agile/items/TASK-028-reconcile-working-record-and-docs.md`
- `agile/plans/TASK-028-plan.md`
- `agile/testing/TASK-028-automated.md`
- `agile/testing/TASK-028-sweep.md`
- `agile/README.md`

## Steps

1. Update `**Status:** Open ...` to `**Status:** Done ...` in each merged item file.
2. Relocate `FEAT-060` under Features in `agile/README.md` with status `Done`.
3. Update `FEAT-059`, `TASK-024`, `TASK-025`, `TASK-026` to `Done` in `agile/README.md`.
4. Add `TASK-028` to the Tasks table in `agile/README.md` with status `Done`.
5. Run `bun run test tools/record.test.ts` to assert zero drift.
