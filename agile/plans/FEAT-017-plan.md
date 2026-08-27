<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-017 — Plan

**Item:** [`agile/items/FEAT-017-forge-integration.md`](../items/FEAT-017-forge-integration.md)
**Branch:** `feature/FEAT-019-commit-signing`
**Status:** implemented.

Not on a branch of its own — the stack is unmerged and this continues it.

## The four decisions, answered

The item left them open. They were answered before a line was written:

1. **Which language owns the HTTP client** — the Rust core. The webview keeps
   its promise of having no way to make a request, and the token never crosses
   into JavaScript, where a devtools network tab would show it.
2. **Direct API, or reuse an already-authenticated host CLI** — direct. Reusing
   `gh` would avoid storing a token, but it makes the feature work only for
   people who have installed and logged into a separate program, and it makes
   every error someone else's error message.
3. **Writes** — none. Read-only. The smallest privacy surface that still answers
   the question the screen asks.
4. **Which hosts** — GitHub first, behind an enum with one arm. A second host is
   a second module and a second arm; nothing above that line changes.

## Approach

### `ureq`, with native TLS

Blocking, which is what this crate already is — `gix` and `shell` are both
synchronous and the workers are threads. `reqwest` would bring `tokio` into a
crate that has no use for it.

`native-tls` rather than `rustls`, deliberately: the platform's own TLS stack
and the platform's own certificate store. A desktop client behind a corporate
proxy with a custom root works without being told about it, which a bundled root
store would not. It also keeps `ring` out of the tree, whose non-SPDX license
needs a clarification entry in `deny.toml` that would have to be maintained.

`webpki-root-certs` still arrives with `ureq` and is linked rather than used.
Its licence — CDLA-Permissive-2.0 — is a **data** licence covering the list of
certificates, is permissive, and is clean inside a GPL-3 work. It was allowed in
`deny.toml` with that reasoning rather than worked around.

### One request, through GraphQL

REST would need a list call, then one per pull request for the file and line
counts, one for the review decision and one for the checks. Thirty open pull
requests is ninety-one requests against a budget of five thousand an hour
shared with everything else the token does.

GraphQL asks for all of it once. That is the entire reason it is used — not
preference. It also means the screen either has everything or has nothing,
which is simpler to render than a list where some rows know their line counts
and others are still waiting.

### The mapping is a pure function

`read_pull_requests` takes JSON and returns rows; it makes no request. Every
shape a host can send — a deleted author, a repository with no CI, a review
decision nobody has made, a node with no number, a GraphQL error arriving with a
200 — is a fixture and a test rather than something discovered against
somebody's real account.

`FEAT-010` fixed the row shape before anything could fill it, and it was not
changed to suit a host. The mapping went the other way, which is what keeps the
UI's vocabulary host-agnostic — the screen says "changes requested" whatever
`CHANGES_REQUESTED` is called somewhere else.

### One call site

`forge/http.rs` is the only file that names `ureq`, and there is a test that
walks the crate's sources to keep it that way. Same argument `shell.rs` makes
about spawning a process: "what does this application send, and where" gets one
answer somebody can read in an afternoon.

It refuses a non-`https` URL before sending anything, follows no redirects at
all — one that changed host would carry the `Authorization` header somewhere the
user never connected — and has timeouts on connect and on the whole call. Its
`Debug` never prints the body, because a body carries a token back in an error
message and a `Debug` in a log line is how a secret escapes.

### A token, not OAuth

A personal access token is issued, scoped and revoked by the person without
touching anything else they own. OAuth needs a redirect listener and a client
secret, and a client secret shipped inside a GPL binary is a client secret
anybody can read. The trade is a paragraph of instructions instead of a design
problem.

The login is **read back from the host** when the token is proved, not typed. A
typed name could be wrong in a way nothing would catch until "waiting on you"
quietly stopped meaning anything.

### Where the secret lives

The OS keychain, keyed by host and login, and nowhere else. `accounts.json`
holds a host and a login — ordinary configuration, worth no more than what is
already in the git remote. There is a test asserting the serialised account
carries no token, which fails if a field is ever added.

Two accounts on one host are two entries; one login on two hosts is two entries.
Handing an enterprise token to `github.com` would be sending a credential to a
service it was never issued for.

### Four failures, not one

Offline, rate limited (and when it ends), refused, and no account for this host.
The item asked for offline and rate-limited behaviour that says which one it is,
and the distinction is made in the core rather than at the screen — a screen
deciding what a 403 meant would be a screen guessing. GitHub answers a spent
rate limit and a permission problem with the same status, and reporting the
second as the first sends the reader away to wait for something that is never
going to change.

### The test that forbade an HTTP client

The roadmap made this an explicit thing to decide. It became a narrower test
that is still worth having: exactly one client, only in `spagitty-core`, only
reachable from `forge/http.rs`, and none at all in the webview or the Tauri
layer. Plus two new ones — the screen holds no token anywhere, and it still
makes no request of its own.

Forbidding outright stopped being possible the moment pull requests were read.
Deleting the test would have thrown away the part that still holds.

## What was not done

- **GitLab.** The second arm of the enum. Nothing above `Kind` needs to change,
  which was the point of the abstraction, but it is not written.
- **Issues, CI status on the graph, clone-from-host.** The item scoped only the
  account and the pull request core; the rest has no item.
- **Writes.** Decided against, not deferred.
- **Pagination.** Fifty pull requests, newest-updated first. Somebody with more
  open is not reading the hundredth row.
- **A background refresh.** Read when the repository changes and when asked.
  Polling on a timer spends somebody's rate limit while they are not looking.
