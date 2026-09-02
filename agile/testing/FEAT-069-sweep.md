<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-069 — Manual sweep

**Item:** [`agile/items/FEAT-069-multi-identity-profiles.md`](../items/FEAT-069-multi-identity-profiles.md)

## Sweep tickets

| Ticket | Preconditions | Steps | Expected result | Priority | Result |
| --- | --- | --- | --- | --- | --- |
| SWEEP-FEAT069-01 | A repository is open | 1. Navigate to Settings (1K) → `You`<br>2. Fill in the `+ Add Profile` form (e.g. Work, `work@example.com`)<br>3. Click `Save Profile` | New profile is saved and appears in the saved profiles card list | P1 | Pass |
| SWEEP-FEAT069-02 | Profiles exist in Settings | 1. Click `Apply to Repo` on a saved profile | `user.name` and `user.email` are written to repository `.git/config` and status strip updates immediately | P1 | Pass |
| SWEEP-FEAT069-03 | A repository is open | 1. Click the identity indicator button on the bottom-left of the status strip | Quick profile switcher dropdown appears listing all saved profiles | P1 | Pass |
| SWEEP-FEAT069-04 | Profile switcher menu is open | 1. Click another profile | The active identity for the open repository updates to the chosen profile | P1 | Pass |
| SWEEP-FEAT069-05 | Profiles exist in Settings | 1. Click the trash icon next to a profile in Settings | Profile is deleted from `profiles.json` and removed from the list | P2 | Pass |
