<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-059 — Dedicated Pull Request Workspace View (Reviewer & Developer Modes)

**Status:** Done.
**Screen:** 1H — Pull requests.
**Raised by:** the author: "on PR tab i want it to open when i click the pr on a new view (inside same window ofcourse)... Reviewer view and Developer view".

## Problem

FEAT-058 added file listing and basic top-level reviews in a side panel, but in-depth reviews require a dedicated full-window workspace with:
1. Clear PR summary headers (title, author, timestamp, checks, commit counts, and review status).
2. Left pane split into collapsible "All changed files" and "List of commits" with marquee scrolling on hover for fixed-width commit summaries and nested commit files.
3. Interactive diff viewing with line-level hover triggers to add inline comments and change requests.
4. Separate Reviewer and Developer modes: Reviewers batch draft comments and publish reviews; Developers reply to feedback threads and mark change requests resolved.

## Change

**Dedicated PR Workspace (`PRWorkspace.svelte`).** Clicking a PR transitions the screen into a full-window two-pane workspace with top meta header, compact title with slow marquee on hover, a leading CHANGELOG entry, collapsible accordions for all changed files and commits with hover auto-scroll, center diff and markdown panes, and bottom action footer.

**Interactive Diff & Inline Comments (`PRDiffPane.svelte`).** Diff lines feature a hover `+` trigger to write inline comments. Draft comments persist locally in `localStorage` across restarts and network failures. Published comments render in threads with reply and resolution capabilities.

**PR Description & Changelog View (`PRMarkdown.svelte`).** The leading `CHANGELOG` entry renders the PR's markdown description, task lists, code fences, and formatted notes.

**REST Endpoints & Forge Integration (`forge/review.rs`, `forge.rs`).** Added endpoints for PR commits (`/pulls/{n}/commits`), commit files (`/commits/{sha}`), inline comments (`/pulls/{n}/comments`), comment replies, and batch review submission with inline drafts. Improved `status_error` to surface exact JSON error messages from host responses.

**Shimmer Loading (`routes/requests/+page.svelte`).** Added flat skeleton shimmer placeholders while credentials decrypt and network reads run, removing false "No account connected" flashes and removing the old side panel.

## Acceptance criteria

- Clicking any PR row transitions to the full workspace view with header, two-pane body, and footer.
- Top header renders compact PR title with slow hover auto-scroll, author, time, checks status, commit count, review status chip, and return button.
- First entry in left pane is `CHANGELOG`, rendering the formatted markdown description in the main pane when clicked.
- Left pane accordion includes "All Changed Files" and "List Of Commits".
- Commits have fixed-width summaries that scroll on hover (marquee) and entire row is clickable to expand per-commit files.
- Selecting a file under all files or under a commit loads its diff in the center pane.
- Hovering a diff line shows a comment trigger to draft inline comments locally with automatic `localStorage` persistence.
- Reviewer mode displays draft counts and submits batch reviews with all inline drafts, forcing immediate comment refresh.
- Developer mode allows thread replies and marking change requests as resolved.
- PR author cannot submit self-approval or change requests per host policy.
- PR list screen renders a smooth shimmer loading skeleton and has no cluttering side panels.

## Non-scope

- Live WebSocket syncing of comments (uses on-demand refresh).
- Graphical rebase within the PR workspace view.

