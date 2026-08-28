<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-059 — Implementation Plan

## Tasks

1. **Backend REST Endpoints (`crates/spagitty-core/src/forge/review.rs`)**:
   - Define `PullRequestCommit`, `PullRequestComment`, and `DraftComment`.
   - Implement `pull_request_commits`, `commit_files`, `pull_request_comments`, `reply_comment`, and `submit_review_with_comments`.
   - Add comprehensive unit tests in `review.rs`.

2. **Tauri Command Bindings (`src-tauri/src/commands.rs`, `src-tauri/src/lib.rs`)**:
   - Bind `pull_request_commits`, `commit_files`, `pull_request_comments`, `submit_review`, and `reply_comment`.

3. **Frontend Store & Types (`src/lib/types.ts`, `src/lib/api.ts`, `src/lib/requests/store.svelte.ts`)**:
   - Add TypeScript types and invoke wrappers.
   - Update `requests` store with workspace state, local drafts, commit selection, comment threads, and role resolution.

4. **UI Components (`src/lib/requests/PRDiffPane.svelte`, `PRWorkspace.svelte`, `RequestRow.svelte`, `+page.svelte`)**:
   - Build `PRDiffPane.svelte` with line hover buttons, draft creator, and inline thread rendering.
   - Build `PRWorkspace.svelte` with top meta header, left accordions (all files & commits with hover marquee), center diff pane, and reviewer/developer action footer.
   - Wire `RequestRow.svelte` click to open workspace.

5. **Automated Testing & Documentation**:
   - Write tests in `src/lib/requests/workspace.test.ts`.
   - Verify 100% typecheck and >=70% test coverage floor.
   - Update `docs/screens.md`, `agile/items/`, `agile/plans/`, `agile/testing/`, and `agile/README.md`.

