<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-018 — Plan

**Item:** [`agile/items/BUG-018-a-menu-cannot-be-dismissed.md`](../items/BUG-018-a-menu-cannot-be-dismissed.md)

## Three wrong diagnoses, and what was wrong with the reasoning

Written down in full, because the fault was found by the author in one sentence
after the agent had spent three attempts on it, and the reason it took three is
more instructive than the fix.

**First: stale pixels from a mis-sized filter layer (BUG-017).** The lens was
clipping the window at the time, and a menu drawn into a layer that was the
wrong size plausibly leaves pixels behind. Claimed cured on sixteen
open-and-close cycles with no ghost.

*What was wrong:* the cycles were driven by a `setInterval`. Nothing about them
resembled a person dismissing a menu. The evidence never touched the reported
behaviour, and "sixteen clean cycles" sounded like confirmation while confirming
nothing.

**Second: the control that opened the menu could not close it.** A pointer sends
`mousedown` and then `click`; the mousedown closed the menu and the click
reopened it. Real, reproducible in a test that fails without the fix.

*What was wrong:* nothing, except that it is a different bug. A real defect
found on the way to another one is not evidence that the other one is fixed, and
it was reported as though it were.

**Third: no `focusout` route out of the menu.** The author's own suggestion —
close when focus leaves. Also real, also kept.

*What was wrong:* it treated dismissal as the thing that was failing. Dismissal
was working the whole time.

**What the three have in common.** Every test in the suite mounts a menu with no
`.lens` in the document, so `liquidGlass` returns `{}` at
`if (!target) return {}` and the pane is **never portaled**. Every test
therefore exercised an arrangement the running application never uses, and the
one line of the module that was broken had no coverage that could fail.

**What found it.** The author, looking at the running window: the frost
disappeared and the menu did not. That splits the pane in two and says plainly
that the registry is being emptied while the node is not being removed — which
is one function, and it is not in `Menu.svelte`.

## Approach

**Whatever moves a node owns putting it away.**

The action moves a pane on to its stage; the action takes it off again. The
previous arrangement delegated the second half to Svelte on the strength of an
implementation detail — that Svelte 5 detaches with `node.remove()` and so is
indifferent to which parent a node ended up in — and wrote that detail into the
module comment as settled fact.

The fix does not replace that claim with a better one about Svelte. It removes
the dependency: the node is removed by the code that moved it, which is true
regardless of what any framework version does.

Guarded on whether *this* action did the moving. `DialogHost` mounts outside
`.lens`, is never portaled, and its node is not this module's to remove. The
removal is idempotent either way — if Svelte has already taken the node, it is a
no-op.

The stage goes when its last pane leaves, mirroring how `host` is already
dropped in `build()`.

## Alternatives considered

**Put the node back where Svelte left it, before Svelte tears it down.**
Restores the framework's invariant rather than working beside it, and is the
tidier idea. Rejected as more fragile in practice: the original parent may
itself be mid-teardown, and the recorded sibling may no longer be a child of it,
so the restore needs guards for cases that are hard to reason about and harder
to test. Removing the node achieves the same end state with no such cases.

**Stop portaling, and give each pane its own filter.** Removes the problem by
removing the mechanism. Rejected: FEAT-057 chose one shared filter over the
window deliberately, because a menu can be open over a dialog and one filter
that knows about both is cheaper and correct at the overlap.

## Files

- `src/lib/ui/liquidGlass.ts` — the removal, the guard, the stage teardown, and
  the corrected comment.
- `src/lib/ui/liquidGlass.test.ts` — the test that should have caught it.
- `src/lib/ui/Menu.svelte`, `src/lib/ui/Menu.test.ts` — the `anchor` and the
  `focusout` route, from the second and third attempts.
- `src/lib/chrome/Toolbar.svelte`, `src/lib/chrome/RepoTabs.svelte`,
  `src/routes/+page.svelte` — the three controls that open on a click and now
  toggle.
- `src/lib/chrome/chrome.test.ts` — the pointer-shaped test.

## Steps

1. Fix the test first: it called `node.remove()` itself between `destroy()` and
   the assertion. Confirm it then fails against the current code.
2. Record whether the action portaled the node; remove it in `destroy()` when it
   did; drop the stage when it empties.
3. Correct the module comment that stated the false claim.
4. Correct BUG-017's record, which claimed this symptom among its own
   acceptance criteria on evidence that did not support it.

## Risks

**A pane the action did not move.** Removing it would take a node Svelte still
owns out of the document. Guarded by the `portaled` flag and covered by the
existing test for a pane mounted outside the lens.

**The blind spot remains for everything else in this module.** No test can
portal, because no test has a `.lens`; the mounted tests in
`liquidGlass.test.ts` build one, which is why the teardown test works, but a
component test of a *menu* still does not. Anything else in `liquidGlass.ts`
that only matters when a pane is portaled is as uncovered today as this was.
Worth its own item; not fixed here.

## Rollback

One file's `destroy()`, plus the two earlier fixes it sits on top of. Reverting
the commit restores the leak.
