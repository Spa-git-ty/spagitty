<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-037 — Plan

**Item:** [`agile/items/FEAT-037-window-depth-and-resizable-panels.md`](../items/FEAT-037-window-depth-and-resizable-panels.md)
**Branch:** `feature/FEAT-037-window-depth`
**Status:** implemented.

## Approach

### The window

Depth is three effects, and the common mistake is to reach for one of them.

| Effect | Why it is separate |
| --- | --- |
| Hairline outline, `0.2px` | Defines the edge. Sub-pixel so it lands as a real line on HiDPI and a faint one at 1x. At 1px it reads as a *border*, which belongs to a component; a window has an edge |
| Inset top highlight | Where light catches a raised surface. Without it the outline reads as a drawn line rather than a lit edge, and the card looks printed on |
| Two shadows | A tight dark one holds the card against the surface; a wide soft one gives it height. One mid-sized blur does neither, and is exactly what makes a page look like it has a sticker on it |

The margin around the card is not decoration: `box-shadow` on an element flush
against the window edge is clipped away entirely, so without `--window-gap`
there is nowhere for the shadow to exist.

`--r-window` is 12px against `--r-panel`'s 8px, deliberately. A corner is read
against what surrounds it, and the whole screen surrounds a window.

**Maximized undoes all of it.** A floating card with a gap around it, on a full
screen, is a window that does not fit. CSS cannot ask Tauri its state, so
`watchMaximized` puts the answer where CSS can read it — `data-window` on the
root — and subscribes to `onResized` rather than polling.

### The panels

`PANELS` becomes a registry rather than two named fields. Each entry carries its
CSS variable, its anchored edge, and its range. The edge is the interesting
field: it is the entire difference between the two drag directions, and making
it data removes the per-panel branch from `Splitter`.

**`Splitter` stops measuring the window**, and this is the part that would have
been a silent bug. The old code measured `.app`, which is correct for the rail —
it is against the window's left edge — and wrong for every panel nested inside a
screen, where the rail's own width sits between the window edge and the panel. It
now measures its immediate neighbour, which *is* the panel being sized, for all
five.

`rail` and `detail` keep their own fields and getters rather than moving into the
record, because a dozen call sites read `panels.rail` and rewriting them would be
churn in service of symmetry.

## Files

| File | Change |
| --- | --- |
| `src-tauri/tauri.conf.json` | `transparent: true` |
| `src/app.css` | window tokens for both themes, `--r-window`, `--window-gap`, the body margin |
| `src/routes/+layout.svelte` | `.app` as a card; the maximized override; `watchMaximized` on mount |
| `src/lib/chrome/window.ts` | `watchMaximized` |
| `src/lib/panels.svelte.ts` | the `PANELS` registry, `size`, `set` |
| `src/lib/ui/Splitter.svelte` | any panel key; measures its neighbour |
| four route files | a `Splitter` each |

## Risk

**`transparent: true` is the one to watch.** BUG-004 was a WebKitGTK defect that
left the window blank for an entire session, and window transparency is the same
subsystem. It is called out in the item, and the fallback is one line: set it
back to `false`, losing the shadow but keeping the corner and edge over an opaque
square.

**Second risk: a stored layout from before this change.** Handled by reading each
panel independently and falling back to its default — no version field, no
migration, and an old layout simply lacks the new keys.

## Verification

```
npx vitest run --coverage   # 1054 tests; branches 72.36%
npm run check               # 991 files, 0 errors
```

Visual verification is the sweep. Amendment 4 was lifted for this session, so the
window itself was launched — but the shadow, corner and edge are judged by eye
and belong to a human.
