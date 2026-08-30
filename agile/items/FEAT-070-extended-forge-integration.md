<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-070 — Extended forge integration

**Status:** Done.
**Screens:** Pull requests (1H), Settings (1K), Graph (1A).
**Raised by:** gap analysis in `docs/analysis/gitkraken-gap.md`.

## Problem

Forge integration (FEAT-017 / FEAT-058 / FEAT-059) provides pull request review
and viewing for GitHub remotes. Users working with GitLab or Bitbucket repositories
have no in-app forge support. Additionally, creating new pull requests directly from
Spagitty and viewing issue trackers linked to commits are not yet supported.

## Change

- **GitLab & Bitbucket Providers in `spagitty-core`:**
  - Implement GitLab REST/GraphQL client in `forge::gitlab` and Bitbucket Cloud in `forge::bitbucket`.
  - Store host tokens securely in system keychain using standard service namespaces.
- **In-App Pull Request Creation:**
  - Action to open a "Create Pull Request" dialog from any pushed branch or chip on Graph (1A).
  - Draft title, description (loading repo PR templates from `.github/` or `.gitlab/`), target branch, and reviewers.
  - Submit PR directly through the configured forge API.
- **Issue Tracking & Commit Links:**
  - Parse issue keys (e.g. `#123`, `PROJ-456`) in commit messages and render clickable chips jumping to browser or in-app summary.

## Non-scope

- Full offline issue tracker editing and board management.
- Custom proprietary forge integrations outside GitHub, GitLab, and Bitbucket.

## Acceptance criteria

- GitLab and Bitbucket tokens authenticate successfully and fetch remote PRs into the PR workspace (FEAT-059).
- Creating a PR sends valid payload and opens the resulting PR workspace.
- Issue references in commit messages parse reliably without breaking plain text formatting.
- `tools/record.test.ts` passes.
