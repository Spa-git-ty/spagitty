<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-012 — Clone (1L)

**Status:** Planned.
**Branch:** `feature/FEAT-012-clone`.
**Surface:** a modal, reachable from All repositories and from the toolbar's
repository picker. No route of its own.

## Problem

Every repository GitLord knows about had to be cloned somewhere else first.
There is no way to bring a new one in.

## Motivation

It is the one missing step in the loop the rest of the application closes: clone
it, see it, work in it. It is also the first operation that needs credentials,
which is why it goes through the `git` binary rather than being reimplemented.

## Scope

- A modal: source URL, destination directory, and the resulting path shown
  before anything runs.
- The clone itself, through `shell::clone`, so credential helpers and the OS
  keychain work exactly as they do on the command line.
- Progress surfaced from git's own stderr.
- Cancelling a clone in progress, which removes only the partial directory the
  clone itself created.
- Adding the result to the All repositories list and opening it.

## Non-scope

- Reimplementing the transport in Rust.
- Prompting for credentials ourselves. If the helper cannot supply them, the
  clone fails with git's message and the user is told to configure a helper —
  GitLord does not collect passwords.
- Submodule recursion beyond passing `--recurse-submodules` to git.
- Choosing a specific branch, depth or filter in the first pass.

## Acceptance criteria

1. A clone of a public URL produces the same result as `git clone` at the same
   path.
2. The destination shown before running is the exact path that will be created.
3. An existing non-empty destination is refused before anything runs.
4. Progress advances visibly for a large repository rather than sitting frozen.
5. `GIT_TERMINAL_PROMPT=0` holds: a repository needing credentials that no
   helper can supply fails with a message instead of hanging.
6. Cancelling stops the process and removes only the directory the clone
   created. A pre-existing directory is never touched.
7. On success the repository is added to the list and opened, and the graph
   paints it.
8. A failed clone leaves no entry in the repository list.

## Dependencies

FEAT-006 (the list it adds to), `shell.rs` (the process boundary).
