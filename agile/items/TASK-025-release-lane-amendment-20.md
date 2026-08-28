<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-025 — The release lane obeys Amendment 20

**Status:** Open on `task/TASK-025-release-lane-amendment-20`.
**Screen:** — (CI/CD and the repository root).
**Raised by:** the author: "fix release ci on github according to our amendments".

## Problem

The first merge into `main` (2026-08-28, run `33204934146`) passed gates 1
through 5 and failed gate 6: the runner has no git identity, and the annotated
tag refused with `fatal: empty ident name (for <runner@…>) not allowed`. So
`v0.1.0` was never tagged and nothing was published.

Underneath the crash, the lane also predates Amendment 20 (ratified
2026-08-28) and misses it in three places:

1. There is no `CHANGELOG.md`, which the amendment requires at the root of
   every releasing repository, created on first contact.
2. Gate 6 and the prerelease workflow write release notes with
   `--generate-notes` — a reconstruction from the commit log, where the
   amendment says a version's notes are its changelog section.
3. Nothing fails when the notes are missing, where the amendment says a tag
   published without notes is an incomplete release.

## Change

- `CHANGELOG.md` created at the root: `Unreleased` on top, Keep-a-Changelog
  groups, the whole first release currently accumulated on `dev` written under
  it. Later work writes its entries there in the same change (Amendment 11's
  discipline applied to Amendment 20's file).
- `tools/release-notes.mjs` — a pure section extractor with a CLI: prints one
  version's section, distinguishes a missing section from an empty one, exits
  nonzero for both. Tested in `tools/release-notes.test.ts`.
- `.github/workflows/gates.yml` gate 6: sets the `github-actions[bot]` identity
  before tagging (repository-scoped, not `--global`), and reads `notes.md` from
  the changelog **before** anything is tagged, so a missing section halts the
  gate with nothing published.
- `.github/workflows/prerelease.yml`: the same identity fix; an alpha's notes
  are the `Unreleased` section, which is what an alpha previews.
- `.github/workflows/draft-release.yml` needs neither identity fix nor notes:
  it tags nothing, and `gh release create` writes its tag server-side. It did
  need macOS — see below.
- `docs/ci.md` reconciled: the failed first run recorded, the gate 6 row now
  says where notes come from, the stale "gates 5 and 6 have never run"
  paragraph corrected, and what each lane builds written down (Amendment 11).

## Every platform, in every lane

Asked for by the author while this was in progress: "releases should build for
linux , windows and mac os".

**Two of the three lanes already did.** Gate 5 in `gates.yml` — the one a merge
into `main` runs, and the one whose artifacts gate 6 publishes — builds on
`ubuntu-latest`, `macos-latest` and `windows-latest`, and all three came back
green on the first `main` run. `prerelease.yml` builds the same three. So the
published release already carries a macOS build; nothing was missing there.

**The draft lane did not**, and said so in its own header: macOS was skipped on
the reasoning that an unsigned app Gatekeeper refuses to open is worse than no
download at all. That reasoning is now overruled by the author's instruction,
and the workflow says so rather than being quietly edited: a Mac user with no
build is stuck, where a Mac user with an unsigned build has one documented step.

- Two Mac runners, not one: `macos-latest` is Apple silicon and a build made on
  it does not run on an Intel Mac. `macos-13` covers Intel, each with its own
  `--target`.
- The `.dmg` is renamed with its architecture as it is collected, because both
  runners produce the same filename from the same product name and version.
- The release notes tell a Mac user what to do about Gatekeeper — open once
  from the right-click menu, or clear the quarantine attribute — instead of
  leaving them with a file that will not open.

**Question to the author —** two things this raises that a real run has to
answer rather than a reading:

1. Gate 5 builds one Mac architecture, Apple silicon. An Intel Mac user gets
   nothing from a published release. Adding `macos-13` there means also making
   sure two `.dmg`s cannot collide when gate 6 flattens the artifacts, on the
   blocking release path — worth doing, but worth doing where it can be watched.
2. Signing and notarisation need an Apple Developer account and repository
   secrets. Until they exist every build is unsigned on both Windows and macOS.

## Non-scope

- Performing the release. Tagging `v0.1.0` happens when the author merges the
  release pull request into `main`; the agent prepares and does not publish
  (Amendments 14, 15, 20).
- Retitling `Unreleased` to `0.1.0` with its date — that belongs to the
  release pull request, when the date is real.
- The candidate gates (SBOM, smoke test, hygiene lint). Still proposals.

## Acceptance criteria

- `node tools/release-notes.mjs Unreleased` prints the section; a missing or
  empty section exits nonzero with a sentence saying which.
- Gate 6 tags with an identity, and refuses to publish a version whose
  changelog section does not exist — before the tag, not after it.
- The prerelease lane publishes an alpha with the `Unreleased` notes.
- Every release lane builds Linux, Windows and macOS, and the draft lane names
  the architecture in each Mac download.
- The notes tell a Mac user how to open an unsigned build.
- `docs/ci.md` matches the workflows as they now are.

## Dependencies

TASK-018 (the first CI run) built the lane this corrects. Amendment 20
(2026-08-28) is what it is corrected against.
