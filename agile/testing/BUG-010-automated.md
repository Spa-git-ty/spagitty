<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-010 — Automated tests

**Item:** [`agile/items/BUG-010-case-insensitive-shadowing.md`](../items/BUG-010-case-insensitive-shadowing.md)
**Plan:** [`agile/plans/BUG-010-plan.md`](../plans/BUG-010-plan.md)

| Test | Layer | What it asserts |
| --- | --- | --- |
| `has no two files whose paths differ only by case` | `tools/case.test.ts` | The general form: two files on Linux are one file on Windows and on macOS. |
| `has no file that shadows another during import resolution` | `tools/case.test.ts` | The form this bug took. `a/x.svelte.ts` is reached by importing `a/x.svelte`, so a sibling `a/X.svelte` answers that import first wherever case is folded — and it is a different file. This check found the second instance (`Dialog`) on its first run. |

Both run on Linux, in the ordinary suite. That is deliberate: the check has to
run where the bug does **not** reproduce, because the machine the code is
written on is the machine that cannot see it.

The existing `NoticeToast` and `DialogHost` component tests are unchanged in
what they assert — only the names moved.

## What is not covered

- **That the Windows build passes.** That is gate 5 and the draft-release
  workflow, not a unit test. What is covered here is the shape that broke it.
- **macOS.** Case-insensitive by default but configurable, so the same test
  covers it without naming it.
- **Import specifiers that are wrong in some other way.** `npm run check`
  already refuses those on any platform.
