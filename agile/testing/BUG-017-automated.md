<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-017 — Automated tests

**Item:** [`agile/items/BUG-017-the-lens-wipes-the-window.md`](../items/BUG-017-the-lens-wipes-the-window.md)

## What was written

Two layers, because the fault had two halves: markup that was wrong, and a
teardown nobody had ever asserted.

### `src/lib/ui/liquidGlassMaps.test.ts` — pure, no document

| Test | Asserts |
| --- | --- |
| covers exactly the element it is on, as a fraction of its own box | The region is `x="0" y="0" width="1" height="1"` in `objectBoundingBox` units. |
| writes no pixel length into the region | The `<filter>` open tag contains no `userSpaceOnUse` and no two-or-more-digit `width` or `height`. This is the regression guard: it fails against the old markup, and it fails again for any future change that puts a measurement back. |
| gives no feImage a subregion, so each one defaults to the region | Every `<feImage>` carries `preserveAspectRatio="none"` and none carries `x`, `y`, `width` or `height` — one set of numbers for the geometry, not two. |
| writes the body through untouched, in CSS pixels | `svgDataUri` emits no `transform="scale(...)"`. The device-ratio compensation is gone and stays gone; with the region fixed it double-counts, and it was visibly over-scaling the frost by 1.36 before it was removed. |

The existing map tests lose their trailing ratio argument, which no longer
exists. Their assertions are unchanged.

### `src/lib/ui/liquidGlass.test.ts` — mounted against a document

| Test | Asserts |
| --- | --- |
| builds the filter the maps describe, over the whole element | The built filter carries the fractional region and `objectBoundingBox`, and three `feImage` sources. Replaces an assertion that the filter contained `width="800" height="600"` — which is exactly the defect, written down as expected behaviour. |
| authors the maps at the filtered element's size, in CSS pixels | The first map decodes to `viewBox="0 0 800 600"` against an 800x600 `.lens`, and carries no scale transform. The maps are still measured; only the region is not. |
| takes a portaled pane back off the stage when it is torn down | After `destroy()` the stage holds no children. |

**Correction, added after this item was called fixed.** That last test was
written to close the gap and did not: it called `node.remove()` itself between
`destroy()` and the assertion, so the stage was empty because the test emptied
it. It passed, and it was reported here as evidence that the DOM was not
leaking. The DOM was leaking. The action never took a pane off its stage, which
is BUG-018; the line was removed there and the test then failed against the code
as it stood on this branch.

Nothing else in this document is affected — the region fix is sound and was
verified against measured pixels — but a passing test was cited here as proof of
something it did not test, and that is worth more than the line it cost.

## Recorded run

```
npx vitest run src/lib/ui/
 Test Files  8 passed (8)
      Tests  160 passed (160)
```

```
npm run coverage
 Test Files  75 passed (75)
      Tests  1846 passed (1846)
All files    |   85.98 |    74.60 |   82.19 |   85.69 |
             |  % Stmts | % Branch | % Funcs | % Lines
```

Above the Amendment 10 floor of 70% on every column, branches included, which is
the one that runs closest to it.

## What the tests do not cover, and why

**That the window paints to its edges.** No test in this suite can see a
rendered pixel: the fault was in how WebKitGTK resolved a unit, and happy-dom
resolves nothing. What is testable is the markup that provoked it, and that is
what is asserted above — the region carries no pixel length, so the unit cannot
be misread whatever the engine decides a user unit is.

The rendering itself was confirmed at the wheel and is written into the sweep,
where a person with a display confirms it.
