<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-041 — The rail stops advertising a shortcut

**Status:** Done on `feature/FEAT-041-drop-log-hint`.
**Screen:** the shell's nav rail, so every screen.
**Requested by:** the author, 2026-08-18: drop the `Ctrl+F` hint from the Log
item.

## Problem

The rail's right-hand column is for counts. One item puts a keyboard shortcut
there instead:

```ts
{ code: '1I', label: 'Log', href: '/search', hint: 'Ctrl+F', glyph: '⌕' },
```

Three things are wrong with it, and only the first is the one that was reported:

1. **It is the only one.** Nine other items either show a count or show nothing.
   A single shortcut in a column of numbers reads as a value that failed to
   render rather than as help.
2. **The notation is one platform's, printed on all of them.** `Ctrl+F` is
   hardcoded. The palette already knows better — `commands.ts` picks `⌘` or
   `Ctrl+` per platform — so on macOS the rail names a key the user does not
   press. This is exactly the defect FEAT-021 removed from the title bar, where
   a `⌘K` chip named the wrong notation *and* the wrong key.
3. **The rail is not where a shortcut is learnt.** `Ctrl/Cmd+P` opens the
   palette, which lists every command with its shortcut, on the platform's own
   notation. That is the one place worth keeping in step.

The shortcut itself is real and stays: `+layout.svelte` handles `f` with the
modifier and goes to `/search?focus=1`.

## The second hint, found with it

`Settings` carries `hint: '·'` — a lone middle dot, from the original scaffold.
In the rail a dot has a meaning already: `countLabel` renders `·` for a count of
`null`, which says *not computed yet*. Settings has no count and never will, so
its dot claims a number is pending that is never coming. Pull requests and
Rebase, which also have no count, show nothing at all.

Removing only the `Ctrl+F` hint would leave that dot as the sole surviving
`hint` in the rail — the exact shape the item is removing, kept for the one item
where it is least meaningful. So both go, and the field goes with them.

## Scope

- Drop `hint` from the Log item and the Settings item.
- Drop `hint` from `NavItem` entirely: nothing else uses it, and the rail's
  right column is counts.
- `NavRail` renders a count or nothing.

## Non-scope

- The shortcut. It works and is unchanged.
- The palette's shortcut list, which is the right place for this information and
  already renders per-platform notation.
- The count dot. `·` for an uncomputed count is a deliberate convention (a wrong
  count is worse than no count) and is untouched.

## Acceptance criteria

- No item in the rail names a keyboard shortcut.
- `Ctrl/Cmd+F` still reaches Log search from anywhere, with the field focused.
- Settings shows nothing where its dot was, like Pull requests and Rebase.
- Counts, and the `·` for an uncomputed one, are unchanged.

## Dependencies

None. Same reasoning as FEAT-021's title-bar chip and TASK-007's copy sweep.
