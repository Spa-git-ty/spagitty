<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-045 — The toolbar names the repository, and picks a branch for real

**Status:** Done on `feature/FEAT-045-toolbar-location`. Plan in
`agile/plans/FEAT-045-plan.md`, tests in `agile/testing/FEAT-045-automated.md`
and `agile/testing/FEAT-045-sweep.md`.
**Screen:** the chrome, so every screen.
**Requested by:** the author, 2026-08-18.

## Problem

The toolbar's two "pickers" pick nothing. Both are buttons that navigate:
`goto('/repos')` and `goto('/branches')`. They look like dropdowns and behave
like links, which is the worst of both — a control that looks like it will open
a list and instead replaces the screen.

## Wanted

In their place, one line that reads as a location:

> **repository** › `branch ▾`

- The repository name in **bold**, as a name rather than a control.
- A `›` between them.
- A real dropdown for the branch — a list that opens in place and checks one
  out.

## Known before starting

- The list is **local branches only**. Remote-tracking refs are not things to
  check out, and offering them in a switcher is how a detached HEAD happens by
  accident.
- Checking out is a write with a dirty-working-copy failure mode. Whatever the
  dropdown does on a failure has to be a sentence, the way `actions.perform`
  already reports.

## Non-scope

- The Branches screen, which keeps every branch operation it has.
- Creating a branch from the dropdown.
- Anything about the remote.

## Acceptance criteria

- The repository's name is shown, not as a button that navigates elsewhere.
- The branch control opens a list of local branches in place.
- Choosing one checks it out and the whole window follows.
- A failed checkout says why, and nothing is left half-switched.
- With no repository open the line says so rather than showing an empty control.

## Dependencies

FEAT-028, which grouped the toolbar. FEAT-004's branch read, which already
returns what the list needs.
