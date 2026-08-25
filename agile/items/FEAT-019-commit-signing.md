<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-019 — Commit signing

**Status:** Done. Plan: [`agile/plans/FEAT-019-plan.md`](../plans/FEAT-019-plan.md).
**Screen:** Working copy (1C), Settings (1K).

## Problem

FEAT-011 added a "Sign my commits" toggle. It persists, and nothing reads it:
`work::commit` passes no signing flag, so a user who switches it on gets
unsigned commits and no indication that the switch did nothing.

## Why it was deferred

Signing is not a flag, it is a dependency on a program the user configured —
GPG or an ssh signer — that can prompt for a passphrase, fail with an unhelpful
message, or not be configured at all. Spagitty commits through the `git` binary
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

- Key management. Spagitty does not create, import or store signing keys, and
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

## What is built, and what is not

The open question above was answered: **`commit.gpgsign` is the authority**, and
the "Sign my commits" toggle left Spagitty's preferences file rather than being
wired up. Two switches for one behaviour disagree the moment one of them is
changed outside this application, and setting `commit.gpgsign` in a terminal is
how the preference is set on every machine that already signs. Settings gained a
**Signing** section under **You**, beside the identity and sharing its scope.

Built:

- `spagitty_core::signing` — `commit.gpgsign`, `gpg.format`, `user.signingkey`
  and the resolved program, read from the same cascade the identity is read
  from, and written with `git config`.
- `--gpg-sign` on the commit, when it is on and only then.
- `Error::Signing`, told apart from an ordinary commit failure by reading git's
  own stderr, so a hook refusing a commit is not relabelled.
- The two conditions that can be known in advance — no signing program, and ssh
  format with no key.
- `signed` on `GraphRow` and `CommitDetail`: the `gpgsig` header, read as the
  walk passes it. Presence, never verification.

Built in a second commit, which is why this item was `Partial` for one:

- The notice on the Working copy screen. The message box says the commit will be
  signed and names the program, or warns — before the button — when signing is
  on and cannot work. Silent when signing is off, which is the ordinary case.
- The signed marking. `S` on the graph row, with a tooltip that says it is not
  verified, and the full sentence in the commit detail panel where there is room
  for the caveat and for `git verify-commit`.

Nothing here says *verified*, and there is a test asserting the word never
appears.

## Not in scope, and still not

Key management, and verification. Spagitty does not create, import or store
signing keys — that boundary is FEAT-017's — and it reads the signature header
rather than checking the signature, which would mean a subprocess and a keyring
per row.
