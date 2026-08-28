<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-045 — Automated tests

**Item:** [`agile/items/FEAT-045-toolbar-repo-and-branch.md`](../items/FEAT-045-toolbar-repo-and-branch.md)
**File:** `src/lib/chrome/chrome.test.ts` — the `Toolbar` block, with the two
picker assertions replaced.
**Stub:** `src/testing/branches-store.svelte.ts`, a reactive stand-in for the
branch store. Reactive rather than a plain object because the dropdown fills in
after `load()` resolves, and a static stub would render the empty list and then
never change. It lives outside `src/lib` so Amendment 10 does not count it.

## Tests

| Test | Holds in place |
| --- | --- |
| `says there is no repository, and offers no control that cannot work` | the empty case: the line says so, and `.field` is not drawn at all |
| `reads as a location once a repository is open` | the name is a `SPAN` and not a control, the `›` is there, the branch is in the field |
| `opens the branch list in place rather than replacing the screen (FEAT-045)` | the item itself — `goto('/branches')` is never called, and the list appears |
| `lists local branches and not remote-tracking refs` | a remote ref is not a thing to check out; offering one is how a detached HEAD happens |
| `shows the branch already checked out, disabled, with its reason` | the `Menu` convention of showing rather than hiding, and `already on it` as the reason |
| `reads the branch list when the dropdown is opened, and not before` | the toolbar is drawn on every screen; reading every branch on start-up is work done for nothing |
| `checks out the branch that was chosen` | the write path reaches `branches.checkout` with the branch's name |
| `says why a checkout was refused, where the switch was asked for` | git's sentence is shown beside the control rather than swallowed |

## Untouched, and deliberately so

The Branches screen keeps every branch operation it has, and its tests are
unchanged. The toolbar's action group — fetch, pull, push, the pull menu, the
disabled actions and their reasons — is untouched and so are its assertions.

## Coverage

1344 tests across 56 files. 1323 pass; the 21 failures are all in
`src/lib/scale.test.ts`, where `localStorage` is undefined under happy-dom 20.
That failure predates this branch and reproduces on `HEAD` with this work
stashed. It is unrelated to FEAT-045 and is recorded here rather than fixed
inside a feature branch.

`npm run check` reports 0 errors and 0 warnings across 993 files.

## Not covered here

- That the dropdown opens **under** the control rather than at the pointer.
  Geometry from a real `getBoundingClientRect()` — `FEAT-045-T2` in the sweep.
- That the whole window follows a checkout: the graph, the tabs and the status
  strip all re-read. The store's reload is stubbed here, so only the call is
  asserted — `FEAT-045-T3`.
- Whether the error line's truncation still says enough to act on with a long
  message from git — `FEAT-045-T4`.
