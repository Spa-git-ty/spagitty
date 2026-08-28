<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# TASK-025 — Automated tests

**Item:** [`agile/items/TASK-025-release-lane-amendment-20.md`](../items/TASK-025-release-lane-amendment-20.md)

## What was tested

`tools/release-notes.test.ts` — eight tests over `sectionFor`, the pure
function the release lane reads notes with. It sits at the tool layer, beside
`tools/record.test.ts`, and runs in the ordinary suite.

| Test | Asserts |
| --- | --- |
| returns a version section without its heading | The section's body comes back; the `## [0.1.0]` line does not. |
| stops at the next version heading | `0.1.0` does not bleed into `0.0.1`, and `Unreleased` does not bleed into `0.1.0`. |
| reads the Unreleased section by its literal name | The prerelease lane's lookup resolves. |
| runs the last section to the end of the file | No trailing heading is required to terminate a section. |
| answers null for a version with no section | A missing section is distinguishable, so the CLI can say *missing*. |
| does not mistake a version named in prose | `0.2.0` mentioned in a bullet is not a section. Only a `## [x]` heading is. |
| answers the empty string for a section that says nothing | An empty section is distinguishable from a missing one. |
| keeps subheadings inside the section | `### Fixed` survives, so grouped notes reach the release. |

**What would have to break for these to fail.** The heading matcher, the
section terminator, or the missing/empty distinction — which are the three
things gate 6 depends on. The prose test exists because a substring search over
the file passes every other test here and is wrong.

## What is not covered, and why

The workflow YAML itself. `git config`, `git tag -a`, `gh release create
--notes-file` and the job's step order are not executable in this suite, and a
test double for them would assert only that the double was written to match the
file it was copied from. That is the class of test
[[test-doubles-that-do-the-work-under-test]] warns about, so it is not written.
The workflow is verified by review and by the next real merge into `main`;
`SWEEP-002` and `SWEEP-003` below carry it.

## Recorded run

```
npx vitest run tools/release-notes.test.ts

 Test Files  1 passed (1)
      Tests  8 passed (8)
```

**Run against a wrong implementation first**, as the record for this repository
requires of a new test. `sectionFor`'s heading match was replaced with
`line.includes(version)` — the naive search — in a scratch copy, and the suite
was pointed at it:

```
 Test Files  1 failed (1)
      Tests  1 failed | 7 passed (8)

 ❯ does not mistake a version named in prose for a section
   expect(sectionFor(changelog, '0.2.0')).toBeNull();
```

One test fails and it is the one written for that defect, so the file is not
seven assertions that cannot fail plus one that can.

Full suite and type check, after the change:

```
npm run check
COMPLETED 1035 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS

npm run test
 Test Files  74 passed (74)
      Tests  1858 passed (1858)
```

## Coverage

`vite.config.ts` scopes the coverage denominator to `src/lib/**`, so a tool in
`tools/` does not move the figure in either direction. Measured after the
change, and above the Amendment 10 floor of 70% on every metric:

```
npm run coverage

All files | % Stmts 85.99 | % Branch 74.71 | % Funcs 82.27 | % Lines 85.54
```

The new tool is nonetheless fully exercised by its own file: every branch of
`sectionFor` — found, missing, empty, terminated, unterminated — has a test.
