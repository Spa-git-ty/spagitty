<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-054 — Plan

**Item:** [`agile/items/FEAT-054-update-check.md`](../items/FEAT-054-update-check.md)
**Branch:** `feature/FEAT-019-commit-signing`
**Status:** implemented.

## Approach

### It goes through the one call site

`forge::http::get_json`, the same file every other request goes through, so
"what does this application send, and where" still has one answer and
`requests.test.ts`'s one-call-site assertion still holds.

`get_json` gained one behaviour: an empty token sends **no** `Authorization`
header rather than an empty bearer. The release list is public and inventing a
credential to read it would be wrong — and some hosts reject a malformed
`Authorization` rather than ignoring it.

### The tag, not the version number

This is the part that would have been got wrong quietly. `Cargo.toml` says
`0.1.0` and will keep saying it across every preview, because the release
workflow increments a preview counter rather than the version. A version
comparison would report "up to date" forever.

So the release workflow bakes `SPAGITTY_RELEASE` into the binary at compile
time, and the check compares tags. That required reordering the workflow: the
tag is computed in its own job **before** the build, rather than after it, so
there is something to stamp.

`option_env!`, not `env!` — absent is the ordinary case for anybody who compiled
it themselves, and it must not be a build error. A build without it reports as a
development build and **never** claims to be out of date: it has no tag to be
behind, and it is usually ahead of every release. Telling somebody their working
tree is older than the release they are about to cut from it would be worse than
saying nothing.

### The URL is not trusted

The endpoint's `html_url` is used only if it starts with `https://`; anything
else falls back to the releases index. It is a string from a host that ends up
in front of a person, and `javascript:` and `file:` URLs are exactly what that
shape of trust is for. There is a test with three hostile values.

### On by default, and the item says why

The exception to this file's own rule, argued in the item rather than smuggled
in. What makes it payable: the sentence next to the switch says precisely what
leaves the machine, the Accounts screen names this as the *only other* request
Spagitty makes, and turning it off stops every request — the startup check reads
the preference before asking, so off means no request rather than a discarded
answer.

### The button is not gated on the preference

`checkForUpdate()` ignores `checkForUpdates`, which governs only the automatic
check. A button that silently did nothing because of a setting on the same
screen would be worse than not having the button.

It is also kept out of `busy`, which gates the writes: a check that could not
reach the network must not leave the identity fields disabled.

### Startup

In the layout's `onMount`, deliberately **not** awaited with the rest — it is
the one thing there that touches a network and nothing on screen should wait on
it. A failure is left in the Settings screen rather than raised as a notice: a
toast on every launch behind a captive portal would be worse than the feature is
worth.

## What was not done

- **Self-updating.** It says a release exists. Replacing a running binary is a
  much larger promise about integrity than this makes.
- **Opening the browser.** No opener in the build; adding one to save a
  copy-and-paste would be a dependency and a new way for a URL from a host to be
  acted on.
- **A badge anywhere but Settings.**
