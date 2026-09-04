<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-070 — Manual sweep

**Item:** [`agile/items/FEAT-070-extended-forge-integration.md`](../items/FEAT-070-extended-forge-integration.md)

## Sweep tickets

| Ticket | Preconditions | Steps | Expected result | Priority | Result |
| --- | --- | --- | --- | --- | --- |
| SWEEP-FEAT070-01 | A repository with a configured GitHub/GitLab/Bitbucket remote is open | 1. Navigate to Pull requests (1H)<br>2. Click `+ Create PR` in header | Create Pull Request modal opens with source branch pre-filled and base branch selector | P1 | Pass |
| SWEEP-FEAT070-02 | Create PR modal is open | 1. Fill in Title and Description<br>2. Select target base branch<br>3. Click `Create Pull Request` | Pull request is submitted via the forge API, confirmation toast appears, and workspace opens the new PR | P1 | Pass |
| SWEEP-FEAT070-03 | A GitLab remote is configured | 1. Open Settings → `Accounts`<br>2. Enter `gitlab.com` and a personal access token | Account connects successfully and username is read back from the host | P1 | Pass |
| SWEEP-FEAT070-04 | A Bitbucket Cloud remote is configured | 1. Open Settings → `Accounts`<br>2. Enter `bitbucket.org` and an app password / token | Account connects successfully and username is verified | P1 | Pass |
| SWEEP-FEAT070-05 | Create PR modal is open | 1. Check `Create as Draft`<br>2. Submit PR | Pull request is created with draft / work-in-progress status | P2 | Pass |
