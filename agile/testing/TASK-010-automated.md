<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-010 — Automated tests

**Item:** [`agile/items/TASK-010-security-gate-advisories.md`](../items/TASK-010-security-gate-advisories.md)

## The tool is the test

This item changes one configuration file that exists to be read by `cargo-deny`.
There is nothing to unit test — the verification is running the gate, which is
what CI does on every push.

| Command | Result |
| --- | --- |
| `cargo deny --all-features check advisories` | `advisories ok` |
| `cargo deny --all-features check licenses` | `licenses ok` |
| `cargo deny --all-features check bans sources` | `bans ok, sources ok` |

## The assertion that matters

A configuration that makes a gate pass proves nothing on its own — a gate that
always passes would also pass. So the gate was made to **fail on purpose**:

```
# RUSTSEC-2024-0413 removed from the ignore list
advisories FAILED

# restored
advisories ok
```

Anything not explicitly listed still fails gate 4, including any advisory that
is a real vulnerability rather than an unmaintained notice. That is the whole
claim of this item, and it is checked rather than argued.

## Frontend and Rust suites

Untouched by this item, and re-run to confirm it: 1041 frontend tests, 280 Rust
tests, all passing.
