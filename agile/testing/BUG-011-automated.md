<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-011 — Automated tests

**Item:** [`agile/items/BUG-011-tls-provider-never-selected.md`](../items/BUG-011-tls-provider-never-selected.md)
**Plan:** [`agile/plans/BUG-011-plan.md`](../plans/BUG-011-plan.md)

| Test | Layer | What it asserts |
| --- | --- | --- |
| `the_agent_is_built_with_a_tls_provider_that_is_actually_compiled_in` | `crates/spagitty-core/src/forge/http.rs` | The agent settles on `NativeTls` rather than the default `Rustls`. Fails against the old code, which is the point. |

## What is not covered, and why it is written down

**No test makes a request.** That is why this shipped, and it is worth being
exact about the trade rather than quietly adding a network test.

The `forge` suite is pure functions over fixtures on purpose: every strange
answer a host can send is covered, and the whole thing runs offline and fast. A
test hitting `api.github.com` would have caught this, and would also fail when
GitHub is slow, spend a rate limit, and make the suite depend on a network for
something the fixtures already prove.

So the transport is covered by hand instead, and the change that follows is not
a new test — it is that SWEEP-017 and SWEEP-054 must run *before* a release.
They were written and not run, and this is what that cost.

The fix was verified live before committing: a real request to
`api.github.com/repos/Spa-git-ty/spagitty/releases/latest`, which returned
`latest=v0.1.0-preview.1`.
