<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-027 — Automated tests

## Run result

```
npm test        824 passed, 0 failed   (49 files)
npm run check   985 files, 0 errors, 0 warnings
cargo test      272 passed, 0 failed   (no Rust change)
```

Eighteen tests in the new `src/lib/workspace.test.ts`, three in
`chrome.test.ts` for the rebuilt bar (two of which replace assertions about the
name and branch chip the bar no longer shows).

## `workspace.test.ts`, 18 tests

| Group | Asserts |
| --- | --- |
| Naming | The directory is the name, trailing separators and Windows paths included, with the whole path as the fallback |
| Opening | A tab is added and activated; an existing one is activated rather than duplicated; past the cap the oldest goes and never the one being opened |
| Remembering | The route and selection come back; an unseen repository has no place; a place outlives its tab, so reopening still lands where it left off |
| Closing | The neighbour to the right becomes active, the left when it was last, null when it was the only one; closing an inactive tab does not move the active one; an unknown path is ignored |
| Restarts | The strip, the active tab and the places are written and read back; an active tab not in the strip is refused; corrupt JSON and entries with no path do not stop the app opening |

## `chrome.test.ts`

| Test | Asserts |
| --- | --- |
| `keeps saying which program this is, whatever is open` | The bar shows "GitLord" even with a repository open — the name and branch moved to the toolbar and the tab |
| `offers the way back to every repository` | The All repositories button routes to `/repos` |
| `shows the open repositories as tabs, with the active one marked` | Two tabs in order, the second marked active |

## What is not covered by automation

- The switch itself: `RepoTabs.switchTo` opens a repository, waits for it, then
  navigates and restores the selection. Each step is covered in isolation
  (`repo.open`, `goto`, `graph.want`), but the sequence against a real backend is
  SWEEP-027-02 and -03.
- The `+` menu's recent list, which needs a backend to return one.
- That a restored selection actually arrives once a walk reaches it.
