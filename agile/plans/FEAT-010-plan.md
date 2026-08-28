<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-010 — Plan

## Approach

Frontend only. No core module, no Tauri command, no dependency. This item builds
the layout and the empty state; FEAT-017 fills them with a host's data.

## Decisions

**The shape is defined now, in `src/lib/types.ts`, and it is the deliverable.**
The screen's value in this pass is not what it shows — nothing is connected —
but that FEAT-017 arrives to a screen that already knows what a pull request
looks like and does not have to redesign it. So `PullRequest` is written with
the fields the design's rows and detail panel need, documented as the contract,
and the layout is built against sample data in tests rather than against
nothing.

**No network, and the way to prove it is the absence of a dependency.** There
is no HTTP client in `Cargo.toml` or `package.json` and this change adds none.
That is a stronger claim than any test could make: a screen with no way to make
a request cannot make one. The sweep confirms it with networking off.

**Host-agnostic vocabulary, enforced by a test.** "Pull request", never a
brand. A test asserts no host name appears in any label, which is the kind of
thing that rots the moment someone adds "Open on GitHub" without thinking.

**The empty state is the screen, not a placeholder.** It says no account is
connected and points at Settings → Accounts. That is more useful than "not
built yet", because it tells the user the screen works and the account does not
— and it is the difference between this and the `ScreenStub` it replaces.

**Two groups, the same device the other screens use.** "Needs you" solid above
"Waiting on others" dashed, with the detail panel beside them. All
repositories already reads this way, and Branches and Commit use dashed for
"nothing to do here".

**No store state that a real host would have to fight.** The store holds the
list, the selection, and the connected-account state. When FEAT-017 lands it
fills the list; nothing here assumes the list arrives all at once or that it
never fails.

## Files

- `src/lib/types.ts` — `PullRequest` and friends, documented as FEAT-017's
  contract
- `src/lib/requests/{store.svelte.ts,RequestRow.svelte,RequestDetail.svelte}`
- `src/routes/requests/+page.svelte` — replaces the `ScreenStub`

## Risks

- **A screen with no data is easy to build wrong**, because nothing pushes back.
  The mitigation is that the tests render it against sample data shaped like the
  real thing, so the layout is exercised rather than merely present.
- **The Settings → Accounts link points at a section that does not exist yet.**
  FEAT-011 is the next item and builds it; until then the link lands on the
  Settings screen, which is honest rather than broken.

## Rollback

Revert the commit. The screen returns to its stub. Nothing else in the
application changes.
