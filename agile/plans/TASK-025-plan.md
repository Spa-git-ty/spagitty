<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-025 — Plan

**Item:** [`agile/items/TASK-025-release-lane-amendment-20.md`](../items/TASK-025-release-lane-amendment-20.md)

## Approach

Fix the crash and the amendment in one pass, in the order that fails safest:
the notes are read out of the changelog *before* the tag is created, so every
way this job can now fail leaves no tag and no release behind — a halt, never
a half-release.

The extractor is a Node script rather than shell in the workflow, because the
workflow is the one place it cannot be tested. The pure function lives in
`tools/release-notes.mjs`, the CLI wraps it, and vitest exercises the function
directly — the same shape `tools/record.test.ts` already gave this repository.

## Decisions

- **Bot identity, repository-scoped.** `github-actions[bot]` with its
  well-known noreply address, set with `git config` (not `--global`) inside
  the release step. The alternative — lightweight tags — would sidestep the
  identity requirement but lose the tagger and date an annotated tag records.
- **Missing and empty sections fail differently worded but equally.** The
  error names the file, the section, and what to do, because gate 6 is run by
  a person reading a red log at release time.
- **The alpha's notes are `Unreleased`.** An alpha is a preview of what has
  not shipped; its section is the one that has no version yet.
- **`draft-release.yml` untouched.** It creates no tag of its own.

## Files

- `CHANGELOG.md` (new)
- `tools/release-notes.mjs` (new), `tools/release-notes.test.ts` (new)
- `.github/workflows/gates.yml`, `.github/workflows/prerelease.yml`
- `docs/ci.md`
- `agile/` — this triplet and the index row

## Steps

1. Extractor and its tests.
2. `CHANGELOG.md` with the accumulated first release under `Unreleased`.
3. Gate 6: version output, notes step, identity, `--notes-file`.
4. Prerelease: notes step, identity, `--notes-file`.
5. `docs/ci.md` reconciled.
6. Triplet, index row, changelog entry for this task itself.

## Risks and rollback

- The fixed gate 6 can only prove itself on a real `main` push; until then it
  is reviewed, not observed. Recorded plainly in the sweep.
- Rollback is reverting the workflow edits; the changelog and extractor are
  inert without them.
