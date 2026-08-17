<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# BUG-004 — Automated tests

## Run result

```
cargo test      314 passed, 0 failed   (272 core + 38 + 4 new)
cargo clippy    0 warnings
cargo fmt       clean
npm test        824 passed, 0 failed   (49 files, untouched)
npm run check   985 files, 0 errors, 0 warnings
```

## The tests

All four live in `src-tauri/src/platform.rs`, next to the code they cover.

| Test | Layer | Asserts |
| --- | --- | --- |
| `unset_environment_gets_the_renderer_disabled` | unit, pure | With nothing in the environment the wanted value is `"1"` — the defaulting that fixes the blank window |
| `an_explicit_value_is_left_alone` | unit, pure | `"0"` and `"1"` both yield no write, so a user's choice reaches WebKit in either direction |
| `even_an_empty_value_counts_as_a_choice` | unit, pure | An empty string is a set variable, not an absent one, and is not overwritten |
| `the_process_environment_carries_the_setting` | unit, process | On Linux, `prepare_webview()` actually leaves `WEBKIT_DISABLE_DMABUF_RENDERER=1` in the process environment. This is the regression test: it fails if the call is dropped or if the write is skipped |

The first three run on every platform because they are a function of their
argument; the fourth is `cfg(target_os = "linux")` because it asserts a
Linux-only side effect.

The process-level test writes a variable no other test in the workspace reads or
writes, which is why it is safe under Cargo's parallel test threads.

## Coverage

`cargo llvm-cov --workspace --ignore-filename-regex 'fixture\.rs'`:

| Scope | Regions | Lines | Branches |
| --- | --- | --- | --- |
| `src-tauri/src/platform.rs` | 95.24% | 96.55% | 100.00% |
| Workspace total | 81.98% | 80.85% | 72.10% |

Comfortably above the Amendment 10 floor of 70%, and the fix raises the total
rather than diluting it. The two uncovered regions in `platform.rs` are the
`cfg!(target_os = "linux")` false arm, which cannot execute on the host that
measures coverage.

## What is not covered by automation

**Whether the window actually paints.** That is the whole point of the bug and
no test in this repository can see it: proving it needs a real WebKitGTK process
on a host whose driver rejects the DMABuf allocation, and a human looking at the
result. The tests prove the variable is set; the sweep proves the fix works.
Every ticket in `BUG-004-sweep.md` exists for that reason.
