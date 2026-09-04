<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-058 — Plan

**Item:** [`agile/items/FEAT-058-pull-request-files-and-review.md`](../items/FEAT-058-pull-request-files-and-review.md)

## Approach

Reuse rather than build. The screen already has a shape, the application
already has a diff renderer, and `forge/` already has a request path with its
TLS, its redirect refusal and its timeouts settled. What is genuinely new is a
patch parser and two endpoints, and the parser is the only part with anything
to get wrong.

So the work splits into a pure function with fixtures, two thin request
wrappers around it, and a panel that mostly arranges components that exist.

## Decisions

- **REST, against the module's own GraphQL precedent.** Written out in the
  module header, because a reader who knows `github.rs` will ask. The rule is
  the same in both places — take whichever needs fewer requests — and here that
  is REST, since GraphQL cannot return a patch at all.
- **Parse the host's patch; do not compute a diff.** The head branch is usually
  not fetched, and for a fork it may be unfetchable. This also keeps opening a
  review off the repository entirely.
- **`FileDiff`, not a new type.** The parser targets the shape `DiffPane`
  already renders. A pull request's diff and a commit's diff are then the same
  thing to everything downstream, including the parts nobody thinks about.
- **A verdict that needs a comment is refused before the request.** GitHub
  answers an empty body with a 422 that does not name the field. Refusing in
  Rust means one sentence the reader can act on.
- **The list is re-read after a review, never patched.** The review decision is
  computed by the host from every reviewer's state, not just this one's.
  Guessing it locally would be a second source of truth for the fact the screen
  exists to show.
- **`forge_credentials` extracted first.** Three commands needing the same
  five-step preamble is where a subtle divergence starts — particularly the
  rule that no lock may be held across an await.
- **The panel, not a new column.** The detail panel already resizes (FEAT-056's
  splitter). Giving the files and the diff a third region would restructure a
  screen that works, for a layout nobody has asked for yet.

## Files

- `crates/spagitty-core/src/forge/review.rs` (new), registered in `forge.rs`
- `src-tauri/src/commands.rs` — `forge_credentials`, two commands;
  `src-tauri/src/lib.rs` — the handler registry
- `src/lib/types.ts` — `ReviewVerdict`; `src/lib/api.ts` — two wrappers
- `src/lib/requests/store.svelte.ts` — files, selection, review
- `src/lib/requests/RequestDetail.svelte` — the panel
- `src/lib/requests/files.test.ts` (new); `requests.test.ts` — one assertion
  that described the old screen
- `docs/screens.md` — 1H

## Steps

1. `review.rs`: the parser, its tests, then the two request functions.
2. The credential extraction, then the two commands, then the registry.
3. The types, the API wrappers, the store.
4. The panel.
5. `files.test.ts`; reconcile the obsolete assertion in `requests.test.ts`.
6. `docs/screens.md`, the triplet, the index row.

## Risks and rollback

- **A patch parser is where the bugs live.** Mitigated by making it pure and
  giving it fixtures for the shapes that are easy to get wrong: a header with no
  counts, the no-newline marker, a stripped blank context line, several hunks.
  One of these caught a real defect during the work — a trailing newline was
  becoming a phantom context line.
- **Reviewing writes to somebody else's server**, and cannot be undone from
  here. Confirmed before sending, and the confirmation names the verdict.
- **Rate limit.** Files are read on selection, once per pull request, never on
  a timer and never per render. The store refuses a re-read it has already made.
- **A pull request with a thousand files.** Paginated at 100, capped at ten
  pages, and the list is scrollable rather than laid out flat.
- Rollback is the two commands: without them the store's new calls are
  unreachable and the panel falls back to what it showed before.
