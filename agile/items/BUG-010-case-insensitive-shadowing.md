<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-010 — A component and its store differ only by case

**Status:** Fixed. Plan: [`agile/plans/BUG-010-plan.md`](../plans/BUG-010-plan.md).
**Screen:** — (chrome; the notice toast and the dialog host)

## What happened

The Windows build failed where every Linux build had passed:

```
src/lib/ui/Notice.svelte (3:10): "notice" is not exported by
"src/lib/ui/Notice.svelte", imported by "src/lib/ui/Notice.svelte"
```

A file importing itself, which is not something anyone wrote.

## Why

`src/lib/ui/Notice.svelte` — the component — sat beside
`src/lib/ui/notice.svelte.ts` — the rune store it reads. The component's import
is `$lib/ui/notice.svelte`, and a bare specifier resolves by trying the path
itself and then the same path with each resolvable extension appended.

On Linux nothing is named `notice.svelte`, so resolution falls through to
`notice.svelte.ts` and finds the store. On Windows — and on macOS with the
default filesystem — `Notice.svelte` **is** `notice.svelte`, so it answers
first. The component imported itself, found no `notice` export, and the build
stopped.

`src/lib/ui/Dialog.svelte` and `src/lib/ui/dialog.svelte.ts` were the same trap,
found by the test written for this bug rather than by the next Windows run.

## Why it was invisible

Gate 3 runs the tests on `ubuntu-latest` only, and the Linux resolution is
correct. Gate 5 builds on all three, but this repository's stack of feature
branches had never been built on Windows — the failure was waiting for the first
one that was.

Nothing was wrong with the code on the machine it was written on, which is the
whole character of the bug.

## The fix

The components were renamed, not the stores: one import each versus eighteen for
`notice`. `Notice.svelte` → `NoticeToast.svelte`, `Dialog.svelte` →
`DialogHost.svelte`. Both names say what the thing is — a toast in the corner,
and the host that renders whichever dialog was asked for.

`tools/case.test.ts` refuses the shape from now on, in the ordinary suite.

## Dependencies

None. Found while building the first draft release.
