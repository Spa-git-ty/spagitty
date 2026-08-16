<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-010 — Automated tests

## Run result

```
cargo test --workspace     236 passed, 0 failed   (217 core, 19 tauri)
npm test                   592 passed, 0 failed   (34 files)
npm run check              937 files, 0 errors
cargo fmt --all --check    clean
cargo clippy --workspace --all-targets -- -D warnings   clean
```

The Rust figures are unchanged from FEAT-009 on purpose: this item adds no Rust
at all. There is no core module, no Tauri command and no dependency, which is
the point of it.

## Coverage against the Amendment 10 floor of 70%

| Tree | Statements / Regions | Branches | Functions | Lines |
| --- | --- | --- | --- | --- |
| Frontend (`src/lib/**`) | 96.42% | 83.60% | 94.49% | 97.21% |
| `src/lib/requests/**` | 98.27% | 71.11% | 97.50% | 100.00% |
| Rust workspace | 88.14% | — | 76.83% | 86.96% |

## Frontend — `requests/requests.test.ts`, 24 tests

### Grouping and selection

| Test | Asserts |
| --- | --- |
| `leads with what is waiting on you` | Acceptance criterion 3's data half |
| `puts every request in exactly one group` | No request can be in both or neither |
| `opens the first request so the panel is never blank beside a list` | |
| `keeps the open request across a refresh when it is still there` | |
| `falls back to the first when the open one was closed elsewhere` | |

### The state before a host exists

| Test | Asserts |
| --- | --- |
| `starts with no account connected, which is the only state in this pass` | Criterion 1 |
| `records a failure to reach a host and shows nothing` | The path FEAT-017 will use when a host is unreachable |
| `clearing forgets the list and the account` | |

### The rows and the panel

| Test | Asserts |
| --- | --- |
| `names the request, its number, its author and when it moved` | |
| `says why it needs you, when it does` | |
| `says nothing about why when it is somebody else's move` | |
| `renders a waiting row dashed` | Criterion 3 — the same device the rest of the application uses for "nothing to do here right now" |
| `shows review and check state, and a draft as a draft` | |
| `says nothing about checks when the host runs none` | A host with no CI is not a host with failing CI |
| `opens a request from its row` | |
| `marks the open row` | |
| `says what it is for before a request is opened` | |
| `shows the branches, the counts and the state` | |
| `says when the host reports it cannot merge` | |
| `disables every action and names what would build it` | Every button on the panel is `disabled` with FEAT-017 in its title |

### The promises this screen makes

These four are the item's real content, because the screen's behaviour is small
and its guarantees are not.

| Test | Asserts |
| --- | --- |
| `uses no host's name anywhere in the screen` | Reads every source file of `src/lib/requests/` and the route, and fails on GitHub, GitLab, Bitbucket, Gitea, Forgejo or Azure DevOps appearing in any of them — criterion 4. Asserted rather than intended, because this is what rots the moment somebody adds "Open on \<host\>" without thinking |
| `makes no network call, because there is nothing to make one with` | The same files contain no `fetch(`, no `XMLHttpRequest`, no `WebSocket` and no `http://` or `https://` URL |
| `links no HTTP client into the application, in either language` | Reads `package.json` and all three `Cargo.toml` files and fails on axios, node-fetch, got, undici, ky, superagent, reqwest, ureq, hyper, isahc, attohttpc or curl — criterion 2. A screen with no way to make a request cannot make one, which is a stronger claim than any behavioural test could make |
| `names every state in words a user of any host would recognise` | The review and check label tables, in full |

## Not covered by automated tests

- **The rail entry no longer reaching a `ScreenStub`** (criterion 5) is
  navigation through the app shell; SWEEP-1H-01.
- **The screen working with networking disabled** (criterion 2's second half)
  needs the network actually turned off; SWEEP-1H-07. The dependency test above
  is the stronger half of the same claim and does run.
- **The Settings → Accounts link landing somewhere useful** depends on FEAT-011,
  which is the next item; until it lands the link reaches the Settings screen,
  which is honest rather than broken. SWEEP-1H-03.
- `src/routes/requests/+page.svelte` is outside the coverage scope, like every
  screen shell.
