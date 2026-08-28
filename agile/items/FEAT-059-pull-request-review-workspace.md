<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-059 — Dedicated Pull Request Workspace View (Reviewer & Developer Modes)

**Status:** Open on `feature/FEAT-059-pull-request-review-workspace`.
**Screen:** 1H — Pull requests.
**Raised by:** the author: "on PR tab i want it to open when i click the pr on a new view (inside same window ofcourse)... Reviewer view and Developer view".

## Problem

FEAT-058 added file listing and basic top-level reviews in a side panel, but in-depth reviews require a dedicated full-window workspace with:
1. Clear PR summary headers (title, author, timestamp, checks, commit counts, and review status).
2. Left pane split into collapsible "All changed files" and "List of commits" with marquee scrolling on hover for fixed-width commit summaries and nested commit files.
3. Interactive diff viewing with line-level hover triggers to add inline comments and change requests.
4. Separate Reviewer and Developer modes: Reviewers batch draft comments and publish reviews; Developers reply to feedback threads and mark change requests resolved.

## Change

**Dedicated PR Workspace (`PRWorkspace.svelte`).** Clicking a PR transitions the screen into a full-window two-pane workspace with top meta header, collapsible accordions for all changed files and commits with hover auto-scroll, center diff pane, and bottom action footer.

**Interactive Diff & Inline Comments (`PRDiffPane.svelte`).** Diff lines feature a hover `+` trigger to write inline comments. Draft comments stay local until publishing. Published comments render in threads with reply and resolution capabilities.

**REST Endpoints & Forge Integration (`forge/review.rs`).** Added endpoints for PR commits (`/pulls/{n}/commits`), commit files (`/commits/{sha}`), inline comments (`/pulls/{n}/comments`), comment replies, and batch review submission with inline drafts.

## Acceptance criteria

- Clicking any PR row transitions to the full workspace view with header, two-pane body, and footer.
- Top header renders PR title, author, time, checks status, commit count, review status chip, and return button.
- Left pane accordion includes "ALL changed files" and "LIST OF COMMITS".
- Commits have fixed-width summaries that scroll on hover (marquee) and expand to reveal per-commit files.
- Selecting a file under all files or under a commit loads its diff in the center pane.
- Hovering a diff line shows a comment trigger to draft inline comments locally.
- Reviewer mode displays draft counts and submits batch reviews with all inline drafts.
- Developer mode allows thread replies and marking change requests as resolved.

## Non-scope

- Live WebSocket syncing of comments (uses on-demand refresh).
- Graphical rebase within the PR workspace view.

