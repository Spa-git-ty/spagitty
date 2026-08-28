<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-043 — Automated tests

**Item:** [`agile/items/FEAT-043-app-status-strip.md`](../items/FEAT-043-app-status-strip.md)
**File:** `src/lib/chrome/chrome.test.ts` — the `StatusStrip` block, and one
assertion moved out of `TitleBar`.

## Tests

| Test | Holds in place |
| --- | --- |
| `states the license and version, which the GPL asks for (FEAT-043)` | the licence is still shown somewhere the user can see it — the assertion followed the identity rather than staying with the component it used to live in |
| `carries the full SPDX identifier where a short one is shown` | `GPL-3.0` is the abbreviation that fits; hovering gives `GPL-3.0-or-later` without opening Settings |
| `says nothing else, on purpose` | the strip's whole text is the identity — the empty left end is a decision, and this is what makes undoing it deliberate |
| `no longer states the license and version, which moved (FEAT-043)` | the title bar does **not** also show it; two copies of one fact is the thing FEAT-021 spent an item removing |

## Coverage

1322 tests across 56 files, all passing.

## Not covered here

- That the strip is clipped to the window's rounded bottom corners. The
  environment applies no stylesheet, so a geometry assertion could not fail —
  `FEAT-043-T2` in the sweep.
- That its height scales with zoom. `applyMetrics` already asserts every
  published metric carries a `px` unit, and `--strip-h` goes through the same
  loop; whether 22px *looks* right at 150% is `FEAT-043-T3`.
- That a screen with its own footer does not stack two bars into a confused
  edge — `FEAT-043-T4`.
