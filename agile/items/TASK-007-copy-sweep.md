<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-007 — Copy sweep: drop the hand-holding, drop the Mac notation

**Status:** Done, implemented on `task/TASK-007-copy-sweep`.
**Screens:** Working copy, Branches, Stash, Log, Rebase, Settings, and the shell.
**Source:** the 2026-08-18 intake, covering requests 5, 7, 10, 12 (first half),
13, 16, 17 and 18.

## Problem

Screens narrate their own limitations in footer prose. The author's objection is
that it reads as talking down to the user: a strip along the bottom of a screen
explaining what the button above it does, or announcing that the application
does not do something.

Separately, key names were written in macOS notation — `⌘`, `⌥` — hardcoded into
screens that run on Linux and Windows, where those keys do not exist.

## The rule applied

A footer sentence stays only if it carries information the user cannot see on the
screen. It goes if it explains what a button obviously does, or announces that
the application does nothing.

Error branches are the case where the footer is the only place a failure appears,
so they are kept in every instance. Where removing the last non-error sentence
would leave a bordered empty strip on every ordinary visit, the footer is made
conditional on there being an error rather than left rendering empty.

## Scope

**Six footer sentences removed**, at the sites the intake lists exactly.

**Eight hardcoded key glyphs replaced** with their portable form —
`⌥`→`⑂` (as a branch glyph, not a key), `⌘F`→`Ctrl+F`, `⌥↵`→`Alt+Enter`,
`⌥↑ / ⌥↓`→`Alt+↑ / Alt+↓` — plus the assertion in `panes.test.ts` that pinned one
of them.

**One conditional kept.** `src/lib/palette/commands.ts:30` picks `⌘` or `Ctrl+`
from `navigator.platform`. macOS is a shipped build target (`gates.yml:166`,
`prerelease.yml:36`), so deleting the branch would print `Ctrl+` on a platform
with no such key. The author decided it stays.

**Settings *Advanced* renamed to *License*** (request 17). The section has only
ever held the version, the build, the project licence and dependency licences,
so the old name described nothing in it. The file moved by `git mv`, nothing
deleted (Amendment 6), and `showFromHash` still accepts `#advanced`.

**One documentation defect fixed.** `docs/AMENDMENTS.md` pointed at
`~/Dev/mywrok/AI_Docs/AMENDMENTS.md`, which does not exist on this machine —
neither does `~/Dev`. The one thing that file exists to do, it did not do.

## Non-scope

- `NavRail.svelte:66`'s `⌘F`, which goes with the whole filter field in FEAT-030.
- The `⇧` and `⇩` glyphs in `Toolbar.svelte`. They are up- and down-arrows for
  Push and Fetch, not the Shift key.
- Any change to what a screen *does*. This is text only.

## Raised, not absorbed

Two things sit inside the sweep's spirit but outside its exhaustive list, so
under Amendment 3 they are reported rather than quietly included:

1. **`src/routes/branches/+page.svelte`** still says *"Nothing here deletes a
   branch."* in the non-error branch of its footer. That is the same genre as
   the sentences removed — an announcement that the application does nothing —
   but the intake's removal table did not list it. It is also arguably stale:
   FEAT-013 covers branch destructive operations. Left in place; say the word
   and it goes.
2. **`src/lib/chrome/TitleBar.svelte:68-69`** contains `⌘K` and `⌘F` inside a
   comment explaining why a shortcut chip was removed. It is historical
   reasoning that argues *for* this sweep rather than user-facing copy, and
   `chrome.test.ts:168-173` asserts against the same string. Left in place.

## Acceptance criteria

- None of the six sentences appears anywhere in the interface.
- No footer renders as an empty bordered strip.
- Every error branch still reaches the screen.
- No hardcoded `⌘` or `⌥` remains outside `palette/commands.ts`, `NavRail.svelte`
  (FEAT-030's), and the two historical comments above.
- Settings shows a **License** chip; `/settings#advanced` still lands on it.
- `docs/screens.md` describes the screens as they now are.

## Dependencies

None. Sequenced after TASK-005 and BUG-006 only so the branch stack stays
linear; it touches none of their files except `docs/`.
