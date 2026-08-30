<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-065 — Implementation plan

**Item:** [`agile/items/FEAT-065-image-and-binary-diffs.md`](../items/FEAT-065-image-and-binary-diffs.md)

## Approach

Extend the diff pipeline to support rich image comparisons and binary file delta
inspection. In `spagitty-core::diff`, add MIME detection, binary diff metadata
extraction, and memory-safe Base64 payload generation for images up to 10MB.
In the frontend, build `ImageDiff.svelte` supporting 2-up (side-by-side), swipe slider,
and onion skin modes over a transparency checkerboard grid, plus `BinaryDiff.svelte`
for non-image binaries displaying byte delta statistics.

## Touched files

- `crates/spagitty-core/src/diff.rs`
- `src-tauri/src/commands.rs`
- `src-tauri/src/lib.rs`
- `src/lib/types.ts`
- `src/lib/api.ts`
- `src/lib/diff/ImageDiff.svelte`
- `src/lib/diff/BinaryDiff.svelte`
- `src/lib/diff/DiffPane.svelte`
- `src/lib/diff/image-binary.test.ts`
- `agile/items/FEAT-065-image-and-binary-diffs.md`
- `agile/plans/FEAT-065-plan.md`
- `agile/testing/FEAT-065-automated.md`
- `agile/testing/FEAT-065-sweep.md`

## Steps

1. Implement `encode_base64`, `detect_mime`, `binary_file_diff`, and `binary_working_diff` in `crates/spagitty-core/src/diff.rs`.
2. Expose `commands::binary_file_diff` and `commands::binary_working_diff` in `src-tauri`.
3. Add `BinaryDiff` TypeScript interface in `src/lib/types.ts` and API functions in `src/lib/api.ts`.
4. Create `ImageDiff.svelte` with 2-up, swipe, and onion skin modes.
5. Create `BinaryDiff.svelte` for non-image binary metadata comparison.
6. Integrate binary/image diff rendering into `src/lib/diff/DiffPane.svelte`.
7. Validate with Rust unit tests, Vitest test suite, and agile record checks.
