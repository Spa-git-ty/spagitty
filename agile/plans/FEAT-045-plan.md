<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-045 — Plan

**Item:** [`agile/items/FEAT-045-toolbar-repo-and-branch.md`](../items/FEAT-045-toolbar-repo-and-branch.md)
**Branch:** `feature/FEAT-045-toolbar-location`
**Status:** implemented.

**Branch point.** Cut from `feature/FEAT-040-graph-footer-facts`, continuing the
unmerged stack rather than from `dev`. The toolbar this item rewrites is the one
FEAT-043 and FEAT-044 rearranged, and a branch cut from `dev` would conflict in
`Toolbar.svelte` and in the chrome tests. The deviation from Amendment 13 is
recorded here as it is in the rest of the stack.

## Approach

The two pickers become one line that reads as a location:

```
before                                  after
  repository  [ gitlumiere ▾ ]  ->/repos    **gitlumiere** › [ main ▾ ]
  branch      [ main ▾ ]        ->/branches
```

### The repository name stops being a control

It becomes text. A bold name, no border, no `▾`, no click. Anything that
navigates to All repositories already exists twice — the rail's screen 1J and
the tabs row's `+` — and a third route that *looks* like a dropdown is the
thing the item is removing.

With nothing open the line reads `no repository`, quietly, and the branch
control is not drawn at all. An empty control is worse than an absent one.

### The branch control becomes a real dropdown

`Menu` is the dropdown. Every other floating list in the application is that
component, and the behaviour that has to be right — outside click, Escape,
arrow keys, staying inside the window, disabled entries showing their reason —
is already right there. It is positioned from the button's own
`getBoundingClientRect()` rather than from a mouse point, so it opens under the
control on a keyboard activation too.

Contents: **local branches only**, `kind === 'branch'`, which is what
`branches.rows` already distinguishes and what the item asks for. Remote-tracking
refs are not things to check out; offering them is how an accidental detached
HEAD happens.

The current branch is in the list, disabled, with `already on it` as its reason
— the `Menu` convention of showing rather than hiding. A detached HEAD has no
current entry to mark, and the control shows the short id instead of a name.

### Checking out reuses the store that already does it

`branches.checkout(name)` — it wraps `api.checkout`, holds `busy`, records
`writeError`, and reloads both the branch list and `repo` afterwards, which is
what makes "the whole window follows". Nothing new is written for the write
path.

Two consequences the item asks about by name:

- **Failure says why.** `branches.writeError` is a sentence from git — the
  dirty-working-copy refusal is the common one. The toolbar shows it beside the
  control until the next attempt, rather than swallowing it, because the toolbar
  is where the action was taken and the Branches screen may never be opened.
- **Nothing is left half-switched.** The store's `finally` re-reads the list and
  the repository whether the checkout succeeded or failed, so the control always
  shows what HEAD actually is rather than what was clicked.

### The list has to be loaded before it can be shown

The toolbar does not own the branch list and must not fight the Branches screen
for it. Opening the dropdown calls `branches.load()` when the store is not
loaded yet — the same call the screen makes, guarded by the store's own `seq`
counter — and the menu shows `reading branches…` as a disabled entry in the moment
before rows arrive. Closing the menu loads nothing.

## Files

`src/lib/chrome/Toolbar.svelte` — the pickers replaced by the location line, the
dropdown, its state and its error line; `.picker` styles replaced.
`src/lib/chrome/chrome.test.ts` — the picker assertions become location and
dropdown assertions.
`src/lib/branches/store.svelte.ts` — read only; no change expected.

## Testing

Component tests mount `Toolbar` with a stubbed `branches` store: the name is
text and not a button, `›` is present, the dropdown opens on click, it lists
local branches and no remote ones, the current branch is disabled with its
reason, choosing one calls `checkout` with the branch's name, a failed checkout
shows the message, and with no repository open the line says so and no dropdown
is drawn.

## Risk

Low, and reversible. The one behaviour genuinely removed is the two navigations;
both destinations remain reachable from the rail, which is what makes the
removal safe rather than a loss.

The risk worth naming is that a checkout is a write started from a control that
is one click away at all times, on every screen. The mitigations are that git
refuses when it would overwrite work, the refusal is shown rather than
swallowed, and the entry for the branch already checked out cannot be chosen.

## Rollback

Revert the branch. No schema, no persistence, no Rust change.
