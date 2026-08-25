<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-017 — Manual sweep

| Field | Meaning |
| --- | --- |
| Priority | P1 blocks the item, P2 should be fixed before release, P3 cosmetic |
| Result | left blank for the tester: pass / fail |

This is the one feature whose live path cannot be tested headlessly. Everything
below needs a real token against a real host, on a desktop with a real keychain.

Make a fine-grained personal access token with **Pull requests: read** and
**Metadata: read**, against a repository with at least one open pull request —
ideally one where a review is requested from you, and one of your own.

---

### SWEEP-017-01 — Connecting an account

- **Priority:** P1
- **Steps:** Settings → You → Accounts. Enter `github.com` and the token, press
  Connect.
- **Expected:** The account appears named with **your login, which you did not
  type** — that is the token being proved rather than believed. The token field
  is empty afterwards. Nothing is echoed back.
- **Result:**

### SWEEP-017-02 — Pull requests arrive and are ordered

- **Priority:** P1
- **Steps:** Open the repository and go to Pull requests.
- **Expected:** The open pull requests, matching what the host's own page shows:
  same titles, same numbers, same branches, same file and line counts. Anything
  with a review requested from you is under **Needs you** and says why; anything
  else is under **Waiting on others**.
- **Result:**

### SWEEP-017-03 — A repository that is not on a host

- **Priority:** P1
- **Steps:** Open a local-only repository — `git init` in a temporary directory
  — and go to Pull requests.
- **Expected:** "This repository is not on a service Spagitty can read", and no
  request is made. Not an error, and not an empty list pretending to be an
  answer.
- **Result:**

### SWEEP-017-04 — The four failures say which one they are

- **Priority:** P1
- **Steps:** Four separate runs.
  1. Disconnect the network, then Refresh.
  2. Connect a token with no access to the repository.
  3. Revoke the token on the host, then Refresh.
  4. Open a GitHub repository with no account connected.
- **Expected:** Four different sentences: could not reach the host; the token
  does not have access; the token was refused (it may have expired or been
  revoked); no account is connected for this host. **None of them says "could
  not load".** Rate limiting is the fifth and is hard to force on purpose — if
  you ever see it, it should name when it will end.
- **Result:**

### SWEEP-017-05 — The token is in the keychain and only there

- **Priority:** P1
- **Steps:** With an account connected, look in the OS keychain for
  `dev.spagitty.app`. Then read Spagitty's `accounts.json` in its configuration
  directory. Then `grep -ri` the whole configuration directory for the token's
  text.
- **Expected:** One keychain entry under `dev.spagitty.app` named
  `<host>:<login>`. `accounts.json` holds a host, a kind and a login and **no
  token**. The grep finds nothing.
- **Result:**

### SWEEP-017-06 — Disconnecting removes the secret

- **Priority:** P1
- **Steps:** Press Disconnect, then look in the keychain again.
- **Expected:** The account is gone from the list and the keychain entry is
  gone. Pull requests goes back to asking for an account. A credential left
  behind that nothing in the interface can reach would be the worst outcome
  here.
- **Result:**

### SWEEP-017-07 — Nothing else leaves the machine

- **Priority:** P1
- **Steps:** Run Spagitty behind a proxy you can watch — `mitmproxy`, or
  `tcpdump port 443` — and use it for ten minutes: open repositories, browse the
  graph, commit, stash, switch branches. Then open Pull requests and refresh.
- **Expected:** **No traffic at all** until Pull requests is opened, and then
  exactly one request per refresh, to the host you connected, and nothing else.
  No telemetry, no repository contents, no paths, no commit messages. This is
  the sweep that checks the promise the Accounts section makes.
- **Result:**

### SWEEP-017-08 — It only reads

- **Priority:** P1
- **Steps:** Go through every control on the Pull requests screen. Then check
  the pull requests on the host.
- **Expected:** Nothing was approved, merged, commented on or closed. There is
  no control that would; this confirms none appeared by accident.
- **Result:**

### SWEEP-017-09 — A GitHub Enterprise host

- **Priority:** P2
- **Steps:** If one is available, connect an enterprise installation by its
  hostname and open a repository on it.
- **Expected:** It works, and it is asked at `<host>/api/graphql`. An account on
  `github.com` is not used for it and its token is not used for `github.com`.
- **Result:**

### SWEEP-017-10 — It does not poll

- **Priority:** P2
- **Steps:** Leave the Pull requests screen open for ten minutes with the proxy
  from SWEEP-017-07 watching.
- **Expected:** No further requests. Reading happens when the repository changes
  and when Refresh is pressed — polling on a timer would spend somebody's rate
  limit while they are not looking at the screen.
- **Result:**

### SWEEP-017-11 — A slow or dead host does not hang the window

- **Priority:** P2
- **Steps:** Point the host field at something that accepts a connection and
  never answers, or pull the network mid-refresh.
- **Expected:** The window stays usable throughout, every other screen keeps
  working, and the read gives up with a message rather than spinning forever.
- **Result:**
