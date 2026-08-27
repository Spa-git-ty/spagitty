<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-054 — Tell people when there is a newer Spagitty

**Status:** Done. Plan: [`agile/plans/FEAT-054-plan.md`](../plans/FEAT-054-plan.md).
**Screen:** Settings → Behaviour (1K).

## Problem

Spagitty ships as an AppImage and a bare `.exe`. Neither has a package manager
behind it, so once somebody has downloaded one there is **nothing at all** that
would tell them a newer one exists — not a notification, not a version banner,
not a repository they are subscribed to. A security fix nobody hears about is
not a fix.

## Scope

- A check that asks the project for its latest release.
- A control in Settings, and a check when the application starts.
- A way to turn the automatic one off.

## The tension this has to answer

Every other preference in this file is off by default, on the stated grounds
that *a preference the user did not set should not change what the application
does*. This one changes what the application does — it makes a network request —
and it defaults to **on**.

That is a deliberate exception and it needs saying out loud: an update check
nobody switches on is an update check nobody gets, and the people most likely to
be running an old build are the least likely to go looking for the switch. The
trade is paid for by making it visible, making the sentence beside it say
exactly what leaves the machine, and making off mean off.

## Non-scope

- **Downloading or installing anything.** It says a release exists and shows
  the link. Spagitty does not replace its own binary, and a self-updater is a
  much larger promise about integrity than this feature makes.
- **Opening a browser.** There is no opener in the build; the link is shown and
  can be copied.
- **A configurable endpoint.** A check for a newer Spagitty that could be
  pointed elsewhere is a way to hand somebody a different program.
- **Notifying on the graph, or a badge.** Settings is where it lives.

## Dependencies

FEAT-017, which built the single HTTP call site this goes through.
