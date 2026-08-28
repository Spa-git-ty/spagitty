<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-006 — All repositories (1J)

**Status:** Done.
**Branch:** `feature/FEAT-006-all-repositories`.
**Route:** `/repos`. **Rail:** "All repositories".

## Problem

Spagitty opens one repository at a time and forgets it on exit. Reopening means
the directory picker every launch, and the toolbar's repository picker — which
looks like a dropdown — goes to a placeholder.

## Motivation

Most people move between a handful of repositories all day. Which ones have
uncommitted work or unmerged branches is the question that decides where the day
starts.

## Scope

- A remembered list of repositories, persisted in the app-config directory.
- A card per repository: name, state chip, path, current branch, and status
  chips — dirty files, ahead/behind, stash count.
- Opening one from the grid.
- Removing one from the list, which forgets the entry and never touches the
  repository on disk.
- Idle repositories rendered as dashed cards with a one-line status.

## Non-scope

- Scanning the filesystem for repositories. Spagitty remembers what it has been
  given and does not go looking.
- Cloning — FEAT-012, which will add to this list when it lands.
- Any write to a repository other than the one currently open.
- Uploading or syncing the list anywhere. It is a local file.

## Acceptance criteria

1. Opening a repository adds it to the list; the list survives a restart.
2. Each card's branch, dirty count and stash count match that repository read
   directly, without it being the open one.
3. A repository whose path no longer exists is shown as missing and is not
   silently dropped from the list.
4. Removing an entry removes it from the list only. The directory on disk is
   untouched, verified by it still being there afterwards.
5. Reading a repository for its card never modifies it — no index refresh
   written, no lock left behind.
6. The list is capped and ordered by last opened, so it does not grow without
   bound.
7. An empty list shows the "Open repository…" action rather than an empty grid.
8. The toolbar's repository picker reaches this screen.

## Dependencies

FEAT-001 (`repo::info`, `status::counts`).
