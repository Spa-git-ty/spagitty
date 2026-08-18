<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-030 — Automated tests

**Item:** [`agile/items/FEAT-030-rail-open-repository.md`](../items/FEAT-030-rail-open-repository.md)
**Run:** `npx vitest run` — 1026 tests, 55 files, all passing.
**Typecheck:** `npm run check` — 991 files, 0 errors, 0 warnings.

## `src/lib/chrome/chrome.test.ts` — 3 added, 1 replaced

| Test | Asserts |
| --- | --- |
| `has no filter field, and does not reach Log from the rail's top slot` | `.filter` and `.field` are both absent, and the string "filter commits" appears nowhere |
| `opens the directory picker from the top of the rail` | The control inside `.open` is labelled "Open repository" and calls `repo.choose()` |
| `paints Open repository as the rail's primary action` | It carries the `primary` class |
| `leaves the foot holding the counts alone` | The foot contains "Tags" and "Submodules" and **no button** — the `⊞` moved out of it |

**Replaced:** `reaches the log search from the filter field`, which asserted the
control this item deletes. Its replacement asserts the absence, so the duplicate
route cannot come back unnoticed.

## `src/lib/nav.test.ts` — 3 added

| Test | Asserts |
| --- | --- |
| `runs the screens in the order they are worked through` | The **whole** `NAV_ITEMS` href list, in order |
| `puts Log immediately after Rebase` | The specific relationship the request asked for, stated on its own so a failure says which rule broke |
| `keeps the divider before All repositories` | `dividerBefore` survives the reorder |

The whole-list assertion is the important one. Checking only that Log follows
Rebase would pass on a list that had silently lost an entry, and a hand-edited
array of ten routes is exactly where that happens.

## Coverage

1026 tests, all four metrics over the Amendment 10 floor. `nav.ts` is a data
table and stays fully covered; `NavRail.svelte`'s branches move with the
collapsed/expanded conditional, which both new tests exercise.

## Not covered here

- That the primary button *looks* primary, or that the rail is legible collapsed.
  The suite applies no CSS. `FEAT-030-T2` and `T3`.
- That `Ctrl+F` still reaches Log now that the rail no longer offers it —
  the shortcut lives in `+layout.svelte` and is untouched, but it is worth a
  human's eye. `FEAT-030-T4`.
