<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-011 — The first HTTPS request kills the process

**Status:** Fixed. Plan: [`agile/plans/BUG-011-plan.md`](../plans/BUG-011-plan.md).
**Screen:** Pull requests (1H), Settings → Updates (1K).

## What happened

Spagitty aborted on the first `https` URL it was ever asked for:

```
thread 'main' panicked at ureq-3.4.0/src/unversioned/transport/mod.rs:485:17:
uri scheme is https, provider is Rustls but feature is not enabled: rustls
thread caused non-unwinding panic. aborting.
```

Not an error. A panic, and a non-unwinding one — the process is gone.

Once FEAT-054 added a check at startup, that meant **the application did not
open at all**.

## Why

`ureq`'s `TlsProvider` defaults to `Rustls` *whichever TLS feature is compiled
in*. FEAT-017 built with `native-tls` and no `rustls`, deliberately — the
platform's own certificate store, and no `ring` in the tree. Enabling the
feature is not the same as selecting the provider, and nothing selected one.

So the agent was configured to use a provider that was not built, and `ureq`
checks that at request time by panicking.

## Why the tests did not catch it

Everything in `forge` is tested against fixtures, on purpose — the mapping from
a host's JSON to a row is a pure function precisely so that no test needs a
network. That was the right decision and it left this hole: **not one test made
a request**.

The one test that came closest asks an unresolvable host and expects an offline
error. It passes, and it always would have: DNS fails before a transport is
ever chosen, so it never reaches line 485.

## How it was found

By running the application and watching it fail to open. Not by a test, not by
review, and not by reading the code — the `Cargo.toml` feature list looks
correct, and it is correct. What was missing was a line somewhere else.

## The fix

Name the provider on the agent:

```rust
.tls_config(TlsConfig::builder().provider(TlsProvider::NativeTls).build())
```

And a test that builds the agent and reads back what it settled on, which is the
thing that was wrong.

## Where it shipped

**`v0.1.0-preview.1` has this defect.** It contains FEAT-017 and no update
check, so it opens normally and then aborts the moment somebody connects an
account or opens Pull requests against a connected one.

The `v0.1.0-preview.2` draft is worse — it carries FEAT-054, so it aborts at
launch. It must not be published.

## Dependencies

FEAT-017, which chose `native-tls`. The choice was right; selecting it was
missing.
