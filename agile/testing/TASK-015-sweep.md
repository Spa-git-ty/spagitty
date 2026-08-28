<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-015 — Manual sweep

**Item:** [`agile/items/TASK-015-document-drift.md`](../items/TASK-015-document-drift.md)

**Preconditions for every ticket:** a checkout of
`task/TASK-015-document-drift` and a terminal at the repository root. Every
ticket is "read this claim, then check it against the code" — a claim confirmed
by reading the document again has not been checked.

---

## TASK-015-T1 — The network claim is true as written

**Priority:** high — it is a privacy promise, in the first section of the README.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Read the Status section of `README.md` | One screen reaches a network; it names which, through which layer, and with whose token. |
| 2 | `grep -rn "ureq" Cargo.toml crates/*/Cargo.toml src-tauri/Cargo.toml` | Declared once, in `spagitty-core` only. |
| 3 | `grep -rln "ureq" crates/spagitty-core/src/` | `forge/http.rs`, and nothing else. |
| 4 | `grep -rn "fetch(\|XMLHttpRequest\|WebSocket" src/` | Nothing. The webview makes no request, as the README says. |
| 5 | Read what the claim says does **not** leave the machine, and check the request body in `forge/github.rs` | It asks for pull requests. No repository contents, no paths, no commit messages. |

**Result:**

---

## TASK-015-T2 — Every "built" claim is true

**Priority:** high — the drift this item exists for.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open `docs/screens.md` and read the table | 1H says "Built", with FEAT-010 and FEAT-017 against it. |
| 2 | Read 1C's paragraph on discarding | Discard is built, unstaged side only, each behind a confirmation. Check against `src/lib/changes/discard.ts`. |
| 3 | Read 1E | It runs the rebase, not just plans it. Check against `rebase.rs`'s execution path. |
| 4 | Read 1F | Delete and rename are landed, not deferred. Check against `ops.rs`. |
| 5 | `grep -n "deferred to\|not built" docs/screens.md` | The only hit is 1D, which belongs to the Conflicts footer item. |

**Result:**

---

## TASK-015-T3 — 1F no longer points at a footer that is gone

**Priority:** medium — the footer was removed a while ago, and the document kept referring to it.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Read 1F's paragraph on ahead/behind | The **header** says how old the numbers are. |
| 2 | `grep -n "footer" src/routes/branches/+page.svelte` | A footer exists only for a failure — not for the drift note. |
| 3 | Open the Branches screen in a build | The age of the numbers is in the header, where the document says it is. |

**Result:**

---

## TASK-015-T4 — The architecture table matches the crate

**Priority:** medium — a module table that lists two thirds of the modules is worse than none, because it reads as complete.

| # | Step | Expected |
| --- | --- | --- |
| 1 | `ls crates/spagitty-core/src/` | Twenty-five entries. |
| 2 | Compare against the table in `docs/architecture.md` | Every module appears, once. `lib.rs` is the only omission, and it is a module list rather than a module. |
| 3 | Search the table for `shell.rs` | One row. It used to have two, with different descriptions. |
| 4 | Read the `forge/` section | Three files, and the sentence about what the webview cannot do. Check each file exists. |

**Result:**

---

## TASK-015-T5 — Nothing true was thrown away

**Priority:** medium — the failure mode of a drift sweep is deleting a claim that was still correct.

| # | Step | Expected |
| --- | --- | --- |
| 1 | Read `docs/ci.md`'s "Not yet running" | Still there. The gates still have not run, so it is not drift. |
| 2 | `grep -n "conflicted apply" docs/screens.md` | Still there. It is still unhandled. |
| 3 | Read the `ScreenStub` paragraph | Still there, and still true: no route renders it. |
| 4 | `git diff 356142f -- README.md docs/` | Every removal has a replacement in the same place. Nothing is merely gone. |

**Result:**
