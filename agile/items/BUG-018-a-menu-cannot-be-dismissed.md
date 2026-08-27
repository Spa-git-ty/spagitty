<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-018 — A menu cannot be dismissed, and the next one is drawn over it

**Status:** Fixed, awaiting sweep
**Branch:** `bugfix/BUG-018-a-menu-cannot-be-dismissed`
**Screens:** all — every menu in the application.

## Problem

A menu stays on screen after it has been closed. Opening another leaves the
first where it was and draws the new one over the top, so they accumulate.

The report was made four times before the cause was found, and three fixes were
attempted against wrong diagnoses. That history is in the plan, because the way
this defect hid is the useful part of it.

**The cause is in `liquidGlass`, not in `Menu`.** The action moves a pane out of
`.lens` — a filter's own subtree cannot contain the pane that bends it — and on
to a stage of its own on `document.body`. It never moved it back. `destroy()`
disconnected its observers, deleted the pane from the registry and rebuilt the
filter, and left the node sitting on the stage.

The module comment stated the opposite as settled fact: that Svelte 5 detaches
with `node.remove()` rather than `parent.removeChild(node)`, so a node that had
been moved was still torn down correctly. Whatever the mechanism, it did not
hold in the running application.

**Why the symptom pointed away from the cause.** The registry emptied correctly,
so the two halves of a pane came apart:

- the **filter** came off exactly on cue, so the frost and the refraction
  vanished the moment the menu closed — everything that looked like glass
  behaved perfectly;
- the **menu's own element** stayed exactly where it was, tinted and bordered by
  its own stylesheet, with the next menu drawn over it.

What is left on screen is therefore a menu that appears not to respond to any
dismissal at all, and every visible clue is inside `Menu.svelte`, where nothing
was wrong.

## Reproduction

1. Open any menu — the branch dropdown in the toolbar is the easiest.
2. Dismiss it by any means: click elsewhere, press Escape, choose an entry.
3. Open a menu again, somewhere else.

**Observed:** the first menu is still on screen, without its frost, and the
second is drawn over it. They accumulate for the life of the session.
**Expected:** a dismissed menu is gone.

**Environment:** Linux, Wayland, WebKitGTK through Tauri v2. Nothing about it is
platform-specific — it is a DOM ownership fault and is present wherever a pane
is portaled, which is every menu raised from inside `.lens`.

## Escalation history — Amendment 9

Declared **CODE ORANGE** after the second failed fix, and **CODE RED** after the
third, at which point the problem was handed to the author with the full
history and the agent stopped touching the code. The author diagnosed it —
"lens removed but menu stayed" — and handed it back. That sentence is what
split the symptom in two and pointed at the portal.

Two of the three attempted fixes are kept, because both correct real defects
found on the way. Neither is what was reported here:

- a control that opened a menu could not close it, because the pointer's
  `mousedown` closed it and the `click` that followed reopened it;
- there was no `focusout` route out of a menu at all, so a dismissal that moved
  focus without a qualifying mousedown had nothing to act on.

## Scope

- The action removes the node it moved, and drops its stage when the last pane
  leaves.
- A pane the action did not move is not the action's to remove — `DialogHost`
  mounts outside `.lens` and is never portaled.
- The module comment stating the false claim is corrected.
- The two defects found while hunting this one are kept and covered.

## Non-scope

- Why Svelte's own teardown did not remove the moved node. The fix does not
  depend on the answer: whatever moves a node owns putting it away, and relying
  on a framework to clean up after a move it was not told about is the mistake
  regardless of how any particular version behaves.

## Acceptance criteria

- A dismissed menu leaves no element behind, by every route out: outside click,
  Escape, choosing an entry, the control that opened it.
- Opening menus repeatedly accumulates nothing.
- A dialog, which is never portaled, is unaffected.
- The teardown is covered by a test that fails without the fix.

## Dependencies

Fixes a defect in FEAT-057, which introduced the portal. Related to BUG-017,
which fixed a different defect in the same module and whose record wrongly
claimed this symptom among its own acceptance criteria; that claim is corrected
on this branch.
