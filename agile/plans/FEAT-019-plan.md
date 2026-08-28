<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-019 — Plan

**Item:** [`agile/items/FEAT-019-commit-signing.md`](../items/FEAT-019-commit-signing.md)
**Branch:** `feature/FEAT-019-commit-signing`
**Status:** implemented, over two commits. The first landed the backend and left
the item `Partial`; the second landed the two pieces of presentation below.

**Branch point.** Cut from `feature/FEAT-034-stash-file-browsing`, continuing the
unmerged stack.

## The open question, answered

The item made this the decision to take first: *"Decide the relationship with
`commit.gpgsign`, which is the same preference expressed in a place every other
tool reads. The toggle and the config key disagreeing is a defect either way
round, so one of them has to be the authority."*

**`commit.gpgsign` is the authority, and the toggle is gone.**

Wiring the preferences-file toggle up would have been the defect rather than the
fix. It would have been a second switch for one behaviour, and the two would
disagree the first time anybody ran `git config commit.gpgsign` in a terminal —
which is how the preference is set on every machine that already signs.

So `signCommits` left `settings.json`, and Settings gained a **Signing** section
under **You**, beside the identity, sharing the identity's global/local scope
chip. It is the same kind of thing: git configuration with a global value and a
repository override, where writing the wrong scope is the mistake nobody notices
until it is on somebody else's commits.

A settings file written before this still carrying `signCommits` is not a
problem — unknown keys were already ignored on the way in, and the next write
drops it.

## Approach

### `signing.rs` reads what git would do

Not just the flag: `commit.gpgsign`, `gpg.format`, `user.signingkey` and the
program that format resolves to, all out of the same cascade the identity is
read from, with the same "last occurrence wins" rule and the same
source-to-scope mapping — `identity::writable` and `identity::origin` became
`pub(crate)` rather than being written twice.

git's booleans are wider than `"true"`: `yes`, `on`, `1`, and a bare key with no
value at all are all true. A value that is not a boolean at all is left for git
to complain about when it runs, rather than failing this read and taking the
screen away with it.

### Saying it before it fails

The item asks that a repository with no working signer be told so *at the point
of commit*. Two conditions are knowable in advance and are checked:

- **The program is not installed.** Asked by running it with `--version` rather
  than by searching `PATH` ourselves — a configured program can be an absolute
  path or a name, and the only answer that matters is whether spawning it works.
  Memoised per program per session: this read happens on every status refresh
  and the watcher can make that several a second.
- **`gpg.format = ssh` with no `user.signingkey`.** ssh has no address to look a
  key up by, so unlike GPG it has nothing to fall back to. This one cannot work
  and can be said outright.

Neither is reported when signing is off. A signer that will not be used cannot
fail to be used, and a warning about one would be noise on every commit.

### A signing failure is reported as one

`Error::Signing { program, stderr }`, separate from `Error::Git`. "commit
failed" for a signing problem sends the reader to look at their message, their
hooks and their index; naming the program git tried to run sends them to the one
thing that is wrong.

Classified by reading git's own stderr rather than by assuming, because a failed
commit is usually a failed commit: a `pre-commit` hook refusing one must not be
relabelled a signing problem. There is a test for exactly that.

### `--gpg-sign`, and only when it is on

What the item asked for, literally. git would sign anyway when `commit.gpgsign`
is set, so the flag is redundant to git — but it is what makes the command say
so in the panel FEAT-020 shows, and it closes the gap between what the Commit
screen promised and what ran.

The flag is decided by reading the configuration inside `work::commit`, not
passed in by a caller: a caller carrying its own answer could disagree with the
configuration between the screen reading it and the commit happening.

### Signed, not verified

`GraphRow.signed` and `CommitDetail.signed` are the `gpgsig` header on the
commit object, read as the walk passes it — the commit is already decoded for
its author and summary, so it costs nothing.

It says the commit **was signed**. It does not say the signature is valid.
Verifying means a subprocess and a keyring per row, and the answer differs per
machine. FEAT-051's plan refused to show an unverifiable tag signature at all;
this shows presence and is careful never to use the word "verified" — a
different call, made because a commit's signature being *present* is itself the
thing a reader is looking for when scanning history, and because the graph can
carry it for free.

### Nothing waits for a human

`shell::run` sets `GIT_TERMINAL_PROMPT=0`, so a signing program that wants a
passphrase on a terminal fails rather than hanging the application, which is the
outcome the item insisted on. A GPG agent with a graphical pinentry still asks —
that is the behaviour the user configured on purpose and gets everywhere else.

## The two pieces of presentation

### The notice, before the button

`MessageBox.svelte` says what this commit will do about a signature. It names
the program when signing will work, and warns when it will not — which is the
item's third bullet, and the reason the two knowable problems are computed at
all.

Silent when signing is off. A note reading "this will not be signed" on every
commit in a repository that never signs is noise on every commit, and the
absence already says it. The warning colour is kept for on-and-cannot-work,
which is the only case worth interrupting for.

### `S`, not a tick

The graph row carries a single mono `S`. Not `✔`: a RefChip already uses that
for "the branch you are on", and one mark cannot mean two things on one screen.

The commit detail panel says it in full, because there is room there for the
caveat and for naming `git verify-commit` as the thing that would actually
check it. The graph row has a letter and a tooltip.

Only when it *is* signed, on both. Same argument as the notice: the absence is
the answer in a repository nobody signs.

Nothing in either place says **verified**, and `rows.test.ts` asserts the word
never appears.

## Non-scope, unchanged

Key management. Spagitty does not create, import or store signing keys and does
not write to the OS keychain — that boundary is FEAT-017's, and it has not
moved.
