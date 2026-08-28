<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-012 — Plan

**Item:** [`agile/items/TASK-012-record-drift.md`](../items/TASK-012-record-drift.md)
**Branch:** `task/TASK-012-record-drift`
**Status:** implemented.

## Approach

Make the record true, then make it check itself. The second half is the one that
matters: an audit fixes today's drift, and a test fixes every future one.

### 1. A word for partly built work

The record used `Backlog` for FEAT-013 and FEAT-015, which are two thirds built.
That is the drift that costs the most — it sends someone to write code that is
already there — and it happened because the vocabulary had no other word.
`agile/README.md` now defines five: `Done`, `Fixed`, `Partial`, `Open`,
`Backlog`, and the **first word** of an item's `**Status:**` line is one of them.
Everything after that word is prose.

Normalising the leading word is what makes the check possible at all: fifty-odd
documents said `Built`, `done`, `implemented`, `fixed on <branch>` and
`open, not started` for four distinct states.

### 2. The index, rebuilt over every item

Three tables — features, bugs, tasks — each sorted by identifier rather than by
the order things were built. Build order is what the git history is for; an index
is for looking something up.

### 3. Identifiers that resolve to nothing

Two kinds, and they need different answers:

- **Cited and real.** `FEAT-033` (divergence on the chip) and `FEAT-034`
  (browsing a stash entry) are named as dependencies and non-scope by items that
  shipped. They get item documents, written from what the citing items say.
- **Cited and not recoverable, or never cited.** `FEAT-031` was cited once, as
  "changes `CommitRows`", and nothing else survives. `FEAT-024`, `FEAT-032` and
  `TASK-006` are cited nowhere. These get a **Skipped identifiers** table saying
  what is known, because "this identifier was never real" is itself a fact a
  reader needs, and Amendment 12 forbids reusing any of them.

`FEAT-035`'s dependency paragraph — which cited both `FEAT-031` and a `FEAT-033`
that meant something else — is corrected in place with the original left
visible, the way BUG-009's cause section was.

### 4. BUG-009b's four documents

Written from the branch, the commit and the tests, which are unusually complete
for this one because the commit message carries the whole argument.

### 5. The check

`tools/record.test.ts`, in the ordinary suite. It asserts joins, never prose:

| Assertion | The drift it would have caught |
| --- | --- |
| every item has exactly one index row, and every row an item | the index stopping at BUG-001 |
| index status equals the item's status | FEAT-018 reading `Backlog` while shipped |
| statuses come from the defined vocabulary | `Built` vs `Done` vs `implemented` |
| built items have four documents, or a declared debt | FEAT-036/038/039/TASK-011 |
| no stale row in the debt table | a backfill that closes without updating the record |
| every `FEAT-`/`TASK-`/`BUG-` cited in `agile/` or `docs/` resolves | `FEAT-031`, `FEAT-033`, `FEAT-034` |

### Why a declared-debt table rather than a hard rule

Four items are merged without their plans, and TASK-013 is a session of writing
on its own. A check that simply failed on them would be turned off within a day.
A check that demands the debt be **named, with what is missing and why**, keeps
the same fact in the record and stays green — and it fails again the moment the
table stops matching the tree, in either direction. Recording a risk rather than
switching the gate off, as `deny.toml` does for advisories (TASK-010).

## Files

`agile/README.md` — rebuilt.
`agile/items/*.md` — status lines normalised; five corrected; FEAT-035's
dependency note.
`agile/items/BUG-009b-*.md`, `FEAT-033-*.md`, `FEAT-034-*.md`,
`TASK-013-*.md` — new.
`agile/plans/BUG-009b-plan.md`, `agile/testing/BUG-009b-{automated,sweep}.md` —
new.
`tools/record.test.ts` — new.
`vite.config.ts` — `include` widened to `tools/**/*.test.ts`.

## Testing

The check is the test. It ran red before the corrections were finished — it
caught a forward citation of an identifier that has no document yet, written by
hand in a document added in this very change, which is exactly the failure mode
it exists for.

Coverage counts `src/lib/**` only (Amendment 10), so `tools/` adds no coverage
and moves no metric.

**One known limit:** `npm run check` type-checks what SvelteKit's generated
`tsconfig` includes, which is `src/`, `test/` and `vite.config.ts` — not
`tools/`. Overriding `include` in the root `tsconfig.json` would replace that
generated list rather than extend it, and would then silently fall behind it.
So this file is not type-checked by gate 2; it is executed by gate 3 on every
run, which is where a mistake in it shows up.

## Risk

Low for the code, which is one test file and one line of config. The real risk is
a check that is annoying enough to be deleted: it asserts joins only, so a
document can be rewritten freely, and a debt can be carried as long as it is
named.

## Rollback

Revert the branch. Nothing in `src/` or `src-tauri/` is touched.
