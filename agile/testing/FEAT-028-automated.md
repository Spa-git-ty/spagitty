<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-028 — Automated tests

## Run result

Covered by the same run as FEAT-027: 824 frontend tests, `npm run check` clean.

## `chrome.test.ts`

| Test | Asserts |
| --- | --- |
| `does not offer to commit, because it cannot` | With three files staged, the toolbar says nothing about committing. The old test asserted "Commit 3 files" here |
| `says which actions are still not built, and no longer lies about the ones that are` | Undo and Redo keep "Not built yet"; Fetch and Push no longer carry it |
| `groups the actions rather than running them together` | Two dividers for three groups |

The old `reaches the commit screen from the primary button` moved to
`~/claudetrashbin/spagitty-FEAT-028/toolbar-commit-button.test.ts` with the
button it covered.

## What is not covered by automation

- That Fetch and Push *do the operation*. They call the same functions the
  palette calls, which are covered by `actions`' own tests; that the click
  reaches them is SWEEP-028-02.
- The centring at narrow window widths.
