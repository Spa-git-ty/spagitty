<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-007 — Plan

**Item:** [`agile/items/TASK-007-copy-sweep.md`](../items/TASK-007-copy-sweep.md)
**Branch:** `task/TASK-007-copy-sweep`
**Status:** implemented.

## Approach

Text only, no logic, and the intake's removal table treated as exhaustive rather
than as a starting point. Where something fell inside the sweep's spirit but
outside its list, it is raised in the item rather than absorbed — Amendment 3
makes the approved scope the scope.

### The four footer shapes

Removing a sentence from a footer has four different right answers depending on
what is left, and each site got the one that fits:

| Site | What was left | Done |
| --- | --- | --- |
| `changes/+page.svelte` | error branch, a conflicts branch, and a button | dropped the `{:else}`; the footer still has a button, so it stays |
| `branches/+page.svelte` | error branch and a second non-error sentence | dropped the `{:else if anyUpstream}` branch only |
| `search/+page.svelte` | **nothing** — one note, no error branch | the whole `<footer>` removed, and its now-dead `.foot` rule with it |
| `stash/`, `settings/` | error branches only | footer made conditional on there being an error |

The last of those is the case the intake named: keeping the element
unconditionally would leave a bordered empty strip on every ordinary visit, which
is worse than the sentence that was removed.

`rebase/+page.svelte` is not a footer at all — the line sat in an empty-state
block beside a sentence that stays, so only the one `<p>` went.

### Key notation

Eight sites, replaced literally, plus `panes.test.ts:241` which pinned the title
string. The `⌥` on the Branches rail entry was never a key — it was being used as
a *branch* glyph — so it becomes `⑂`, which is what it was drawing.

`palette/commands.ts:30` keeps its `navigator.platform` conditional, by the
author's decision, because macOS is a shipped target. That makes the rule
"portable notation everywhere, one deliberate runtime exception", which is
written into `docs/screens.md` so the next person does not delete it as an
oversight.

One replacement had to be done by hand rather than by pattern:
`+layout.svelte:118` read ``` `⌘F` — or `Ctrl+F` where there is no command
key` ```, and a literal substitution produced ``` `Ctrl+F` — or `Ctrl+F` where
there is no command key` ```. It now reads "or the command key equivalent on
macOS", which is what the sentence was for.

### The rename

`Advanced` → `License`. `git mv` for the file (Amendment 6 — renamed, never
deleted), the `Section` union and `SECTIONS` for the id and label, the heading,
and every importer.

`showFromHash` gains an explicit `advanced` → `license` redirect rather than
adding `advanced` to the union. Putting it in the union would keep a second name
for one thing alive forever; a redirect states plainly that the old name is
history and still works.

## Files

Six route files, five `src/lib` files, one `git mv`, two test files, and two
documents. `docs/screens.md` is updated in the same change under Amendment 11 —
key notation in three places, the section name, and a new paragraph recording
why `#advanced` still resolves.

## Testing

This change removes text and renames a section; it adds no branches to
first-party logic and needs no new coverage to hold the floor. One test is added
where behaviour genuinely changed:

- `store.test.ts` — `#advanced` and `advanced` both select `license`. Without the
  redirect this fails, because `isSection('advanced')` is now false and the call
  silently selects nothing.

Two existing tests are updated to match: `panes.test.ts:241`'s title assertion,
and `sections.test.ts`'s component name and import.

The existing test that asserted the old fragment (`showFromHash('advanced')` →
`'advanced'`) is repointed at `appearance`, so it still tests what it was written
to test — that a fragment works without its `#` — rather than being deleted.

## Risks and rollback

**Risk: a removed sentence was load-bearing.** The judged case is
`search/+page.svelte`, whose footer carried `↵` and `Alt+Enter` hints. Those are
genuinely information not otherwise visible, and removing them makes two
keyboard paths undiscoverable. The intake listed the line for removal and the
author approved it, so it goes — but it is the one removal that loses something,
and it belongs in the command palette instead. Raised here rather than silently
kept.

**Risk: an old `#advanced` link.** Covered by the redirect and its test.

**Rollback:** revert the branch. Nothing depends on any of it; `git mv` reverses
cleanly.

## Verification

```
npx vitest run     # 825 tests, 49 files, all passing
npm run check      # 985 files, 0 errors, 0 warnings
```

The typecheck warning that appeared mid-work — `Unused CSS selector ".foot"` in
`search/+page.svelte` — was the dead rule left by the removed footer, and is
fixed rather than suppressed (Amendment 7 admits no dead code).
