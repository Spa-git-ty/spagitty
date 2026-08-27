<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-043 — Plan

**Item:** [`agile/items/FEAT-043-app-status-strip.md`](../items/FEAT-043-app-status-strip.md)
**Branch:** `feature/FEAT-043-status-strip`
**Status:** implemented.

## Approach

Give the shell a bottom edge, then move one thing onto it.

The request is "move the licence and version to the bottom right", and the
reason it had not been done is that there was nowhere to move it to: every
screen draws its own footer or none, so the shell had no row that belongs to the
window rather than to what is open. So the work is a component and one line of
layout, and then the move is trivial.

### Where it is mounted

`StatusStrip.svelte` is the **last child of `.app`**, outside `.main`:

```
.app
  TitleBar
  Toolbar
  .main   → NavRail | Splitter | screen
  StatusStrip
```

- Outside `.main`, so it spans the rail as well as the screen — it is the
  window's edge, not the screen's footer.
- After it, so nothing scrolls over it; `.main` already takes `flex: 1` and the
  strip takes `flex: none`.
- Inside `.app`, which has `overflow: hidden` and the window radius, so the
  strip is clipped to the rounded bottom corners for free.

### Its height is a metric, not a number in a stylesheet

`STRIP_H = 22` sits with `TITLEBAR_H` and `TOOLBAR_H` in `metrics.ts` and is
published as `--strip-h`, so it scales with zoom like the rest of the chrome. A
hard-coded height would keep a 22px strip under 150% type.

Shorter than the title bar deliberately: it carries one line of secondary type
and nothing clickable, and a strip as tall as a bar reads as a place where
something ought to be happening.

### The left end stays empty

This is the decision most likely to be undone by accident later, so it is
written down and asserted: the strip says the build identity and **nothing
else**. A status bar filled with second copies of what the rail and toolbar
already say is how it becomes noise. Whatever goes there first should have to
argue for itself.

## Files

`src/lib/chrome/StatusStrip.svelte` — new.
`src/routes/+layout.svelte` — the import and one element.
`src/lib/chrome/TitleBar.svelte` — the note, its style and its `version` import
removed; the comment rewritten to say where it went.
`src/lib/metrics.ts` — `STRIP_H`, published as `--strip-h`.
`src/lib/chrome/chrome.test.ts` — the licence assertion moves, and two more.

## Testing

The GPL assertion follows the identity rather than staying with the title bar:
`states the license and version, which the GPL asks for` now renders the strip.
The title bar gets the inverse assertion, so the identity cannot quietly exist
in both places. A third test pins the empty left end.

## Risk

Low. Nothing is removed from the application, and the one thing that moved is
static text.

Two things to watch, both visual and both in the sweep: that the strip is
clipped to the window's bottom radius rather than squaring it off, and that no
screen with its own footer now shows two stacked bars that read as one confused
edge. The graph's footer is the case to look at, and it is FEAT-040's subject.

## Rollback

Revert the branch; the identity goes back to the title bar.
