<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-066 — Manual sweep

**Item:** [`agile/items/FEAT-066-diff-content-search.md`](../items/FEAT-066-diff-content-search.md)

## Sweep tickets

| Ticket | Preconditions | Steps | Expected result | Priority | Result |
| --- | --- | --- | --- | --- | --- |
| SWEEP-FEAT066-01 | A repository is open | 1. Navigate to Log search (1I, `/search`)<br>2. In the `diff content` field, enter a string known to be added or modified in history (e.g. `calculate_total`)<br>3. Press `Enter` or click `Search` | Search results stream and list all commits that added or removed that string in their diffs | P1 | Pass |
| SWEEP-FEAT066-02 | Search results are showing for a diff content filter | 1. Add an `author` filter (e.g. `Ada`)<br>2. Submit search | Results narrow to commits matching both the diff content AND author filters | P1 | Pass |
| SWEEP-FEAT066-03 | A `diff:...` chip is displayed in the active chips row | 1. Click the `×` on the `diff:...` chip | The diff content filter is removed and search automatically re-runs with remaining filters | P1 | Pass |
| SWEEP-FEAT066-04 | Search is run with a diff content string matching zero commits | 1. Search for a non-existent string | View displays empty state pointing out `diff:...` as the narrowest applied filter | P2 | Pass |
