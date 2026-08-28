<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-059 — Manual Sweep

## Steps Verified

1. Open Requests screen with connected account.
2. Click any Pull Request row -> full workspace opens.
3. Check top header elements: PR number, title, author, time, commit count, checks chip, review status chip, and return back button.
4. Expand and collapse "ALL changed files" and "LIST OF COMMITS" accordions.
5. Hover over commit with long title -> summary scrolls to reveal full text.
6. Click commit to expand -> lists individual commit files.
7. Click a file under all changed files or under a commit -> diff renders in center pane.
8. Hover over diff line in Reviewer mode -> `+` icon appears on gutter. Click `+` -> inline draft editor opens.
9. Enter inline comment and save -> draft comment card appears on that line with "Pending Review Draft" badge.
10. Check bottom footer -> displays draft count and "Publish Review" button.
11. Click "Publish Review" -> modal opens with verdict options (Approve, Request Changes, Comment), summary textarea, and draft count summary.
12. Toggle mode to Developer View -> draft options switch to thread reply inputs and resolve buttons.
13. Click "Back" -> returns cleanly to Pull requests list view.

