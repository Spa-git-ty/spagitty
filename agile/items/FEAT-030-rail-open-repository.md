<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-030 — The rail: the open-repository slot, and Log's place in the order

**Status:** Done on `feature/FEAT-030-rail-open-repository`.
**Screen:** the shell's nav rail.
**Source:** the 2026-08-18 intake, covering requests 12 (second half) and 19.

## Problem

Three separate complaints about the same strip of screen.

1. **The rail's top slot is spent on a duplicate.** A "filter commits / ⌘F"
   field sat above the nav items and did nothing the Log screen's own query bar
   and the `Ctrl+F` shortcut in `+layout.svelte` did not already do. It was a
   third route to a thing that had two, occupying the most valuable slot in the
   rail.
2. **Open repository… is in the least discoverable place there is.** It sat in
   `.foot`, below a spacer, at the bottom. It is the one action a new user needs
   before anything else on the screen means anything.
3. **Log sits before Rebase**, which does not match how the screens are worked
   through.

## Scope

- Remove the filter field and its `.filter` / `.field` styles.
- Lift **Open repository…** into that slot, styled as the primary action.
  Collapsed, the `⊞` glyph moves with it.
- The foot keeps "Tags N · Submodules N", alone — and is hidden while collapsed,
  since a counts line with no room for its labels is not a counts line.
- Reorder `NAV_ITEMS` so Log follows Rebase.

## Non-scope

- Anything about the Log screen itself. Its query bar is what made the rail's
  field redundant, and it is untouched.
- The collapsed rail's behaviour beyond the two controls that moved.

## Acceptance criteria

- No filter field in the rail, expanded or collapsed.
- Open repository… is the top control, and is painted as primary.
- It still opens the directory picker, expanded and collapsed.
- The foot holds the counts and no buttons.
- Rail order is Graph, Working copy, Conflicts, Branches, Stash, Pull requests,
  Rebase, Log, divider, All repositories, Settings.
- `Ctrl+F` still reaches Log from anywhere.

## Dependencies

TASK-007 left `NavRail.svelte:66`'s `⌘F` in place specifically for this item,
which deletes the whole field rather than rewriting a glyph inside it.
