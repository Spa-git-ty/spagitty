<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-074 — Automated test record

**Item:** [`agile/items/FEAT-074-the-activity-drawer.md`](../items/FEAT-074-the-activity-drawer.md)

## What was written

`src/lib/farm/drawer.test.ts`, 8 tests, one per promise in the item:

- `puts a time on every line`.
- `keeps more than a screenful, which the strip it replaced could not` — forty
  events, forty lines. The strip showed six.
- `filters to one task` — and only offers tasks that have said something, since
  a filter that returns nothing is not worth offering.
- `reads one task's transcript beside the activity`, and asserts the activity is
  *not* mixed into it, which is the reason there are two tabs.
- `says what to do when there is nothing to read yet`, per tab.
- `holds the list still, and says how much arrived while it was held` — the one
  test that needed scaffolding, see below.
- `collapses to its bar, and asks to be expanded again`.
- `shows no time for an event recorded before times existed` — a blank, never
  1970.

`src/lib/panels.test.ts` gained `bottom` to the sides a panel may declare, and
`farmLog` to the widths a reset restores.

## The scaffolding, and why it is not a lie

Hold is about events arriving *after* the drawer is on screen, and the mount
helper passes props once. A plain `.test.ts` cannot hold a `$state`, so
`src/testing/DrawerHarness.svelte` does: it owns the event list, hands the test
a function to push one in, and renders the real drawer with real props.

It is scaffolding around the component, not a substitute for it — the assertions
are all on what the drawer rendered — and it lives in `src/testing/`, which is
outside the coverage denominator.

## Test command and output

```
$ cargo test
test result: ok. 502 passed   (spagitty-core)
test result: ok. 303 passed   (spagitty-farm unit)
test result: ok.  28 passed   (spagitty-farm pipeline)
test result: ok.  73 passed   (spagitty)

$ cargo clippy --all-targets -- -D warnings
Finished

$ bun run test
Test Files  108 passed (108)
     Tests  2395 passed (2395)

$ bun run check
COMPLETED 1121 FILES 0 ERRORS 0 WARNINGS
```

`flat.test.ts` caught a real mistake while this was being written: the drawer
read `var(--fg)`, which nothing defines — it would have rendered a hard-coded
fallback and ignored the theme. The token is `--ink`.

## Coverage

Every new front-end file has tests; the Rust change is a wrapper type exercised
by the whole farm suite, whose events all go through it. The Amendment 10 floor
of 70% holds.

## What is not covered automatically

- **The motion.** A test can assert a class is applied; whether a wash is
  pleasant or distracting is a person's judgement. `SWEEP-FEAT074-06`.
- **The drag.** `Splitter`'s vertical arithmetic is asserted through the panel
  store, but the feel of dragging a drawer is `SWEEP-FEAT074-05`.
