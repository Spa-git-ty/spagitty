<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-021 — Themes, and a title bar that stops lying

**Status:** Done. Plan in `agile/plans/FEAT-021-plan.md`, tests in
`agile/testing/FEAT-021-automated.md` and `-sweep.md`.
**Surface:** the chrome's title bar, and Settings → Appearance (1K).

## Problem

Two things, and they meet in the same place.

**GitLumiere has no visual system.** `src/app.css` said so itself: its hex values
were "wireframe placeholders and are expected to be replaced by the real visual
system". The result is a white program and a black program rather than a
designed one.

**The title bar carries two controls that should not be there.** A `⌘K` chip
that opens Log search — the shortcut is actually `⌘F`, and the notation is
macOS's on a Linux machine, so it names a key combination that does nothing. And
a light/dark toggle that predates the Settings screen, which means one
preference with two controls.

## Motivation

The token *structure* was right from the first commit and every colour in the
application already comes through it: there is no hex literal anywhere outside
`app.css`, and the lane canvas resolves its colours from the stylesheet at paint
time. So supplying real palettes is a matter of filling in a table, not of
re-plumbing anything — and a program people look at for hours should not look
unfinished.

## Scope

- Four families — Catppuccin, Dracula, Tokyo Night, Gruvbox — each with a light
  and a dark variant, named the way that family names them.
- Palettes as data, applied as custom properties, so they can be tested.
- Settings → Appearance: mode, and a family picker showing each family's own
  colours in the mode that is on.
- The title bar loses both chips.

## Non-scope

- A custom palette editor, or importing a theme from a file.
- Per-screen overrides.
- Anything about typography, spacing or the structural metrics — those are
  `src/lib/metrics.ts`'s and are not colours.
- Syncing the theme to the OS as it changes. The OS preference is consulted
  once, on a first run with nothing stored.

## Acceptance criteria

1. Four families, eight palettes, each variant named by its family.
2. Switching family or mode repaints the whole application, including the
   graph's lane canvas, without a reload.
3. The choice survives a restart, and an installation that stored only a
   light/dark preference keeps it.
4. A hand-edited or unreadable stored value falls back to the default rather
   than leaving the window with no colours.
5. In every one of the eight palettes, ordinary text reaches 4.5:1 against its
   background and secondary text, the accent and every lane colour reach 3:1.
6. Text on a filled accent surface reaches 4.5:1 against that accent.
7. The first paint, before any JavaScript has run, is already the default
   family rather than a flash of something else.
8. The title bar carries neither a `⌘K` chip nor a theme control, and Settings
   → Appearance is the only place the theme is set.

## Dependencies

FEAT-001 (the chrome and the token structure), FEAT-011 (the Appearance
section this replaces).
