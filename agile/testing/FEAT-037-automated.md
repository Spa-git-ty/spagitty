<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-037 — Automated tests

**Item:** [`agile/items/FEAT-037-window-depth-and-resizable-panels.md`](../items/FEAT-037-window-depth-and-resizable-panels.md)
**Run:** `npx vitest run --coverage` — 1054 tests, 55 files, all passing.

## What is asserted, and what cannot be

The window's depth is three CSS effects. None of them can be tested here: the
environment applies no stylesheet, and a shadow is a judgement anyway. Asserting
that a `box-shadow` declaration exists would be a test that passes while the
window looks wrong, so none is written. That half is `FEAT-037-T1` to `T3`.

The panel registry is logic and is covered.

## `src/lib/panels.test.ts` — 8 added

| Asserts |
| --- |
| Every panel publishes its own CSS variable at its default |
| `set` and `size` work by key, and reach the variable |
| Every panel clamps to **its own** range, checked at both ends for all five |
| `rail` and `detail` are reachable through the old named API *and* the new one — a dozen call sites still use `panels.rail` |
| A stored width for a new panel is restored |
| A layout stored **before** a panel existed loads, and that panel takes its default — no migration, no version field |
| A stored width out of range is clamped rather than trusted |
| Every entry declares a side, and `min < initial < max` |

The last one is a table check on the registry itself. It is cheap and it catches
the class of mistake that registry actually invites: a new panel added with a
default outside its own bounds.

## `src/lib/ui/Splitter.test.ts` — harness rewritten

The splitter used to measure `.app`; it now measures its immediate neighbour.
The harness therefore builds a neighbour with a box and places it on the correct
side — before the splitter for a left-anchored panel, after it for a
right-anchored one — which is itself an assertion about the ordering the
component depends on.

All 16 existing behaviours pass unchanged: drag directions, clamping, keyboard,
double-click reset, and the locked collapsed rail.

## Coverage

| Metric | Value | Floor |
| --- | --- | --- |
| Statements | 86.97% | 70% |
| Branches | 72.36% | 70% |
| Functions | 84.25% | 70% |
| Lines | 86.19% | 70% |
