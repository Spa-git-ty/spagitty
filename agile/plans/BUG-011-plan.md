<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-011 — Plan

**Item:** [`agile/items/BUG-011-tls-provider-never-selected.md`](../items/BUG-011-tls-provider-never-selected.md)
**Branch:** `feature/FEAT-019-commit-signing`
**Status:** fixed.

## The fix

One call on the agent builder, naming the provider that is actually compiled in:

```rust
.tls_config(
    ureq::tls::TlsConfig::builder()
        .provider(ureq::tls::TlsProvider::NativeTls)
        .build(),
)
```

Enabling a feature and selecting a provider are two different things, and only
one of them was done. The comment at the call site says so, because the
`Cargo.toml` feature list reads as if it settles the question and does not.

## The test, and what it can and cannot do

`the_agent_is_built_with_a_tls_provider_that_is_actually_compiled_in` builds the
agent and reads back the provider it settled on. That is exactly the thing that
was wrong, and it fails against the old code.

What it does **not** do is make a request. A test that did would catch this and
every future version of it, and would need a network — which is the trade this
crate has deliberately refused everywhere else, so that the suite is honest
offline.

So the gap is covered twice instead: by this test for the specific defect, and
by SWEEP-011-01 for the general one. It was also verified by hand against the
live endpoint before this was committed — a real request to
`api.github.com`, which came back `latest=v0.1.0-preview.1`.

## What this says about the shape of the tests

The `forge` tests are pure functions over fixtures, and that was the right call:
it is why every odd answer a host can send is covered. The cost is that nothing
exercises the transport, and both bugs found by running the application live
there. Neither is a reason to make the suite depend on a network; both are a
reason for SWEEP-017 and SWEEP-054 to be run before a release rather than after
one, which is the change that actually follows.
