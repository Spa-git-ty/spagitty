<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-044 — Automated tests

**Item:** [`agile/items/FEAT-044-repo-tabs-own-row.md`](../items/FEAT-044-repo-tabs-own-row.md)
**File:** `src/lib/chrome/chrome.test.ts` — a `RepoTabs` block, and one
assertion rewritten in `TitleBar`.

## Tests

| Test | Holds in place |
| --- | --- |
| `shows the open repositories as tabs, with the active one marked` | the behaviour, moved to render `RepoTabs` directly — it was always about the tabs and only reached them through the title bar |
| `is a row of its own, which is where it now lives (FEAT-044)` | the row exists and wraps the tab strip |
| `draws no row at all when nothing is open (FEAT-044)` | the empty case: no band of chrome across an empty application |
| `keeps the way to open a repository in the row` | the `+` went with the tabs and did not get lost in the move |
| `no longer carries the tabs or the way back (FEAT-044)` | the title bar has neither — asserted from the other side, so the tabs cannot end up in both rows |

## Untouched, and deliberately so

Switching, closing, the busy mark on the active tab, the `+` menu and the
workspace's memory of where each repository was left are all unchanged, and
their tests are unchanged with them. This item moves a row; it does not touch
what a tab does.

## Coverage

1328 tests across 56 files, all passing.

## Not covered here

- That the tabs sit **on** the row's bottom boundary, with the active one's
  accent underline reading as part of it. Geometry against a real stylesheet —
  `FEAT-044-T2` in the sweep.
- Whether four rows of chrome is too many. That is a judgement, and
  `FEAT-044-T4` asks for it explicitly.
