<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-059 — Automated Test Record

## Rust Backend Tests (`crates/spagitty-core/src/forge/review.rs`, `forge/github.rs`)

- `read_commits_parses_json_response`: Verifies commits list parsing from host REST answer.
- `read_commit_files_parses_files_array`: Verifies commit diff extraction.
- `read_comments_parses_inline_review_comments`: Verifies inline comments and replies parsing.
- `read_comment_parses_single_reply`: Verifies single reply parsing.
- `submit_review_with_draft_comments_allows_empty_top_level_body`: Validates draft comments payload formation and error prevention.
- `a_pull_request_arrives_in_the_shape_the_screen_renders`: Validates GraphQL pull request body and fields parsing.

## Frontend Unit & Component Tests (`src/lib/requests/workspace.test.ts`)

- `opens workspace and loads PR data`: Verifies transition to workspace mode and parallel fetching of files, commits, and comments.
- `closes workspace back to list view`: Verifies switching back to requests list.
- `selects commit and loads commit files into cache`: Verifies commit diff isolation.
- `adds and removes draft comments`: Verifies local draft comments management.
- `preserves draft comments on review failure`: Validates draft comments retention on network or auth errors.
- `submits review with draft comments included`: Verifies batch review submission with inline drafts.
- `resolves comment threads`: Verifies marking threads as resolved.
- `replies to comment thread`: Verifies inline reply dispatch.
- `determines role from author vs connected user`: Validates developer vs reviewer role assignment.
- `mounts and renders PR header, accordion panes, and controls`: Validates UI mounting, accordions, title marquee, and view toggling.
- `opens and closes review modal in reviewer mode`: Validates review modal lifecycle and self-review author rules.
- `renders diff lines, comments, and draft composers`: Validates `PRDiffPane` inline triggers and comment cards.
- `renders empty message when markdown is empty`: Validates `PRMarkdown` empty state placeholder.
- `renders headings, code blocks, lists, and formatted text`: Validates `PRMarkdown` syntax parsing and component rendering.

## Coverage

- Svelte lines coverage floor: >=70% strictly maintained (85.6% achieved across all suites, 1930 tests passing).
- Rust tests: 470 unit tests passing.
- 100% typechecked (`npm run check` clean with 0 errors).

