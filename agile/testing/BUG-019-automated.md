<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-019 — Automated tests

**Item:** [`agile/items/BUG-019-closing-the-last-tab-leaves-the-repository-open.md`](../items/BUG-019-closing-the-last-tab-leaves-the-repository-open.md)

## What was written

Both in `src/lib/chrome/chrome.test.ts`, against a mounted `RepoTabs`.

| Test | Asserts |
| --- | --- |
| closes the repository when the last tab is closed | One tab open and active; clicking its × calls `repo.close()` exactly once. Fails without the fix — the counter stays at 0. |
| does not close the repository while another tab is left | Two tabs; closing the active one calls `repo.close()` not at all, because that path is a switch. Guards the other side, so the fix cannot become "always close". |

The `info` helper gained a `path` parameter and derives the name from it, so a
second repository can be described. It defaulted to one hard-coded path, which
is fine until a test needs two.

## Why no existing test caught it

Because none could. The double at `src/testing/repo-store.svelte.ts` had:

```ts
async close() {
    calls.closed += 1;
    control.reset();
}
```

`control.reset()` clears the call counters along with the state, so `close()`
incremented `calls.closed` and wiped it in the next statement.
`expect(repoCalls.closed).toBe(1)` could not pass however correct the code was.

`close()` now clears only what the real store clears — info, token, counts, and
the generation. Counter resetting stays in `control.reset()`, which the suite
calls between tests.

This is the second time in this session that a defect survived because the
scaffolding around it quietly did the thing under test. The other was a teardown
test that removed a node itself. Both were passing tests asserting nothing, and
both cost more than the line they saved.

## Recorded run

```
npx vitest run src/lib/chrome/
 Test Files  2 passed (2)
      Tests  58 passed (58)
```

```
npm run coverage
 Test Files  75 passed (75)
      Tests  1870 passed (1870)
All files    |   86.17 |    74.95 |   82.44 |    85.80 |
             |  % Stmts | % Branch | % Funcs | % Lines
```

Above the Amendment 10 floor of 70% on every column.
