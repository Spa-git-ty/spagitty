<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-019 — Commit signing

**Status:** Backlog. No plan yet; one is written when the work starts.
**Screen:** Working copy (1C), Settings (1K).

## Problem

FEAT-011 added a "Sign my commits" toggle. It persists, and nothing reads it:
`work::commit` passes no signing flag, so a user who switches it on gets
unsigned commits and no indication that the switch did nothing.

## Why it was deferred

Signing is not a flag, it is a dependency on a program the user configured —
GPG or an ssh signer — that can prompt for a passphrase, fail with an unhelpful
message, or not be configured at all. GitLumiere commits through the `git` binary
precisely so the configured signer runs, but a signing failure has to be
reported as a signing failure rather than as "commit failed", and that is the
work.

## Scope when started

- Pass `--gpg-sign` when the toggle is on, and only then.
- Report a signing failure as one, naming the program git tried to run.
- Say what will happen before it happens: a repository with no configured
  signer, with the toggle on, must be told at the point of commit and not
  after.
- Show whether an existing commit is signed, on the Graph and Diff screens.
- Decide the relationship with `commit.gpgsign` in git config, which is the
  same preference expressed in a place every other tool reads. The toggle and
  the config key disagreeing is a defect either way round, so one of them has
  to be the authority.

## Non-scope

- Key management. GitLumiere does not create, import or store signing keys, and
  does not write to the OS keychain — that boundary is FEAT-017's.

## Notes for whoever picks this up

- The passphrase prompt is the hard part: `shell::run` sets
  `GIT_TERMINAL_PROMPT=0` so a credential request comes back as a failure
  rather than hanging the app forever, and a GPG agent with no tty behaves the
  same way. Whatever this does, it must not be "hangs until killed".
- `commit.gpgsign` set in the repository already makes every commit signed
  without the toggle. Reading the effective config is how the screen tells the
  truth about what will happen.

## Dependencies

FEAT-003 (the commit path), FEAT-011 (the toggle).
