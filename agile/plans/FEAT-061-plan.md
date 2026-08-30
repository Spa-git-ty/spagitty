<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-061 — Implementation plan

**Item:** [`agile/items/FEAT-061-brand-guide-and-showcase.md`](../items/FEAT-061-brand-guide-and-showcase.md)

## Approach

1. Rewrite `docs/branding.md` to establish an exhaustive brand guide and agent directive book covering mark semantics, color tokens, typography, clearspace, UI application, and anti-drift rules.
2. Build an interactive HTML showcase template inside `tools/make-brand.py` and output it to `assets/brand/preview.html`.
3. Update `agile/README.md` to register `FEAT-061`.
4. Validate with `tools/record.test.ts` and automated checks.

## Touched files

- `docs/branding.md`
- `tools/make-brand.py`
- `assets/brand/preview.html`
- `agile/README.md`
- `agile/items/FEAT-061-brand-guide-and-showcase.md`
- `agile/plans/FEAT-061-plan.md`
- `agile/testing/FEAT-061-automated.md`
- `agile/testing/FEAT-061-sweep.md`

## Steps

1. Author `docs/branding.md` with full guide specifications for humans and agents.
2. Update `brand_preview_html()` in `tools/make-brand.py` with the new design.
3. Generate `assets/brand/preview.html`.
4. Add `FEAT-061` to `agile/README.md`.
5. Run test suite and record tests.
