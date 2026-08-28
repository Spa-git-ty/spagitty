<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-025 — Manual sweep

**Item:** [`agile/items/TASK-025-release-lane-amendment-20.md`](../items/TASK-025-release-lane-amendment-20.md)

This sweep is run at a terminal and on GitHub, not in the application. Nothing
in this task changes anything a user sees in Spagitty.

**SWEEP-003 is the ticket that matters.** The fixed gate 6 cannot be observed
until a real merge into `main` runs it, so until that ticket is filled in, this
task is reviewed rather than verified.

| Ticket | Preconditions | Steps | Expected result | Priority | Pass/Fail |
| --- | --- | --- | --- | --- | --- |
| SWEEP-001 | A checkout of this branch, `node` on the path | 1. `node tools/release-notes.mjs Unreleased` 2. `node tools/release-notes.mjs 9.9.9; echo $?` 3. `node tools/release-notes.mjs Unreleased no-such-file.md; echo $?` | 1 prints the Unreleased section and nothing else — no `## [Unreleased]` heading, no later section. 2 prints a line naming the missing section and exits `1`. 3 prints a line naming the missing file and exits `1`. | High | |
| SWEEP-002 | The pull request for this branch is open | Read the checks on the pull request | Gates 1 to 4 are green. Gates 5 and 6 do not run on a pull request into `dev`, and their absence is correct rather than a missing result. | High | |
| SWEEP-003 | The release pull request has been merged into `main` by the author | Open the gate 6 job for that run | The job tags `v0.1.0`, and the published release's body is the changelog's `0.1.0` section verbatim — not a generated list of commits. No `empty ident name` error. | High | |
| SWEEP-004 | A published release exists from SWEEP-003 | Open the release on GitHub and read its assets | The Linux, macOS and Windows artifacts from gate 5 are attached, and the tag points at the merge commit. | Medium | |
| SWEEP-005 | `dev` has an `Unreleased` section with entries | Run the `prerelease` workflow with an unused alpha number | It publishes `v0.1.0-alpha.N` as a pre-release whose body is the `Unreleased` section. It does not touch `main` and is not marked latest. | Medium | |
| SWEEP-006 | A branch whose `CHANGELOG.md` has an empty `Unreleased` section | Run the `prerelease` workflow from it | The notes step fails and the job stops. **No tag is created and no release appears** — the failure lands before anything is published. | High | |
| SWEEP-007 | The repository's releases page | Read `v0.1.0-preview.1` and `v0.1.0-preview.2` | Both are still present and still marked pre-release. Neither has been retagged, moved or deleted (Amendment 14). | Low | |
| SWEEP-008 | A branch under `draft/**` pushed to the remote | Wait for the draft release workflow and read the draft it leaves | Four builds are attached: an `.AppImage`, a `*-setup.exe` and bare `.exe`, and **two** `.dmg`s — one ending `-macos-arm64`, one `-macos-x86_64`. Neither Mac file has overwritten the other. | High | |
| SWEEP-009 | The draft from SWEEP-008, and a Mac | 1. Download the `.dmg` matching that Mac's architecture 2. Follow the note in the release body 3. Open Spagitty | It installs and opens. Gatekeeper's refusal on a plain double-click is expected — the point of the ticket is that the note in the notes is the step that gets past it, and that it is accurate. | High | |
| SWEEP-010 | A published release from SWEEP-003 | Read its attached files | It carries a Linux, a Windows and a macOS build. **Note which macOS architecture** — gate 5 runs one Mac runner, and whether an Intel build is missing is the open question in the item. | Medium | |

## Negative paths this sweep deliberately covers

- **SWEEP-006** is the one that proves the ordering decision in the plan: the
  notes are read before the tag is written, so a missing section cannot leave a
  tag behind with no release attached to it.
- **SWEEP-007** exists because the easiest way to "tidy" a preview tag is to
  delete it, and Amendment 6 and Amendment 14 both forbid that.
