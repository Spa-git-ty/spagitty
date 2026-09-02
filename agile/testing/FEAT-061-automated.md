<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-061 — Automated test record

**Item:** [`agile/items/FEAT-061-brand-guide-and-showcase.md`](../items/FEAT-061-brand-guide-and-showcase.md)

## What was tested

1. `tools/record.test.ts` to assert that `FEAT-061`'s item, plan, automated, and sweep test documents exist and match `agile/README.md`.
2. `tools/make-brand.py` runs and matches `assets/brand/preview.html` with zero drift.
3. Full vitest unit suite (1,943 tests) and cargo test suite (538 tests) execute cleanly.

## Test command & output

```
$ bun run test tools/record.test.ts
✓ tools/record.test.ts (429 tests)
Test Files  1 passed (1)
Tests  429 passed (429)
```
