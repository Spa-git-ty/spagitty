<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-019 — Manual sweep

| Field | Meaning |
| --- | --- |
| Priority | P1 blocks the item, P2 should be fixed before release, P3 cosmetic |
| Result | left blank for the tester: pass / fail |

Needs a machine with a real signing key, which no fixture can provide. Set one
up in a scratch repository:

```sh
SIG=/tmp/spagitty-signing
mkdir -p "$SIG" && cd "$SIG"
git init -q -b main
git config user.name "Ada Lovelace"
git config user.email ada@example.com
# whichever you have; the ssh path needs no keyring
ssh-keygen -t ed25519 -N '' -f "$SIG/signer"
git config gpg.format ssh
git config user.signingkey "$SIG/signer.pub"
printf 'one\n' > a.txt && git add -A && git commit -q -m "Unsigned"
```

**SWEEP-019-04 and -05 are expected to fail** until the two pieces named in the
plan's *What is not built yet* are built. They are written now so the gap is
recorded rather than remembered.

---

### SWEEP-019-01 — The switch is git's switch

- **Priority:** P1
- **Steps:** Settings → You → Signing. Turn it on with **this repository**
  chosen. Then run `git config --local commit.gpgsign`. Turn it off and run it
  again. Then set it in a terminal with `git config --local commit.gpgsign true`
  and reopen Settings.
- **Expected:** `true`, then `false` — written, not unset. A value set in the
  terminal shows here without anything else being done. There is no second
  signing toggle under Behaviour.
- **Result:**

### SWEEP-019-02 — A commit is actually signed

- **Priority:** P1
- **Steps:** With signing on, commit something from the Working copy screen.
  Then run `git log --show-signature -1`.
- **Expected:** The commit carries a signature. With **Show the git command
  behind each action** on, the Commands panel shows `--gpg-sign` on the commit.
- **Result:**

### SWEEP-019-03 — A signing failure says it was a signing failure

- **Priority:** P1
- **Steps:** With signing on, point git at a signer that cannot work —
  `git config gpg.ssh.program /bin/false` — and commit.
- **Expected:** The message names the program and says it could not sign this
  commit. It does **not** read as a generic "commit failed", and it does not
  send the reader to look at their hooks or their message.
- **Result:**

### SWEEP-019-04 — Told before it fails, not after

- **Priority:** P1 — **not built yet**
- **Steps:** Turn signing on, then `git config gpg.format ssh` and
  `git config --unset user.signingkey`. Open the Working copy screen.
- **Expected:** The message box says signing is on and cannot work, and why,
  *before* Commit is pressed.
- **Result:**

### SWEEP-019-05 — A signed commit looks signed

- **Priority:** P2 — **not built yet**
- **Steps:** Make one signed and one unsigned commit. Look at the Graph, then
  open each in the Diff screen.
- **Expected:** The signed one is marked on both screens and the unsigned one is
  not. Nothing anywhere claims the signature is *verified* — hovering says so
  plainly.
- **Result:**

### SWEEP-019-06 — Nothing hangs waiting for a passphrase

- **Priority:** P1
- **Steps:** Configure a GPG key with a passphrase and no graphical pinentry
  (`export PINENTRY_USER_DATA=` and a `pinentry-tty`), then commit.
- **Expected:** The commit fails with a message. The application stays usable —
  it does **not** sit there until it is killed. This is the failure mode the
  item singled out.
- **Result:**

### SWEEP-019-07 — The scope is the one that was chosen

- **Priority:** P2
- **Steps:** Turn signing on globally, then open a repository that sets
  `commit.gpgsign = false` locally.
- **Expected:** The section says signing is off and that the value comes from
  this repository. With **global** chosen it warns that the repository sets its
  own, so editing the global value will not change what it commits with.
- **Result:**

### SWEEP-019-08 — An old settings file still opens

- **Priority:** P2
- **Steps:** Put `{"signCommits": true}` into Spagitty's `settings.json` and
  start the application.
- **Expected:** It starts, the other preferences are at their defaults, and the
  next settings write drops the key. Nothing signs because of it — that
  preference is `commit.gpgsign` now.
- **Result:**
