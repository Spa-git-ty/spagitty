<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-058 — Automated tests

**Item:** [`agile/items/FEAT-058-pull-request-files-and-review.md`](../items/FEAT-058-pull-request-files-and-review.md)

## What was tested

### The patch parser and the mapping — `forge/review.rs`, 20 tests

Pure functions with fixtures. No network, no repository, no fake server.

| Test | Asserts |
| --- | --- |
| a patch becomes the hunks the diff screen renders | Header numbers and line count off a whole patch |
| every line carries the number it has in the version it belongs to | Context advances both sides, an addition only the new, a removal only the old |
| the line text arrives without its diff prefix | The prefix goes and the code's own indentation stays |
| a hunk header with no count means one line | `@@ -1 +1 @@`, which GitHub sends for a single-line file |
| several hunks in one patch each keep their own numbering | The second hunk counts from its own header |
| the no-newline marker is not a line of either version | `\ No newline at end of file` annotates, it is not content |
| an empty line inside a hunk is context rather than the end of it | Some hosts strip the leading space from a blank context line |
| anything before the first hunk header belongs to no hunk | `diff --git` and `index` preamble |
| a patch that is not a patch is no hunks rather than a panic | Empty, malformed header, non-numeric range |
| a file list arrives in the shape the screen renders | Path, status, counts and hunks off one entry |
| every status github sends has a word the screen knows | Seven inputs including `changed`, `copied` and an unknown one |
| a file the host sends no patch for is marked rather than shown empty | Binary and over-size arrive the same way and are not guessed between |
| an entry with no path is skipped rather than invented | |
| an empty list is an empty list and not an error | |
| a message where a list should be is reported in the host's own words | A 200 carrying `{"message": ...}` |
| something that is not json is an error rather than a panic | An HTML error page from a proxy |
| a verdict that needs a comment is refused before anything is sent | Both verdicts, whitespace-only comment |
| approving needs no comment | |
| every verdict has the word github expects | |
| the url is the host's api root rather than github.com for an enterprise repo | Both bases |

**One of these caught a real defect while it was being written.** Four tests
failed on the first run: a trailing newline was becoming a phantom context
line, because splitting on `\n` yields an empty final segment and the
blank-context rule then took it for content. The fix is one `strip_suffix`, and
the four tests are what found it.

### The store and the panel — `src/lib/requests/files.test.ts`, 32 tests

What is not the network: selection, staleness and rate limit.

- **Presenting** — opens the first file so the pane is not empty behind a list;
  keeps the open file when it survives a re-read; falls back to the first when
  it does not; opens nothing for a pull request that changes nothing.
- **Loading** — reads by number; does **not** read twice for the same pull
  request, because the screen calls this from an effect that re-runs on every
  render; does read again after a failure, because the reader asked; keeps the
  host's sentence and drops stale files on failure; does nothing outside Tauri
  or with nothing open; **drops a read that lands after the reader has moved
  on**, driven by resolving a held promise rather than by a timer.
- **Selecting** — a different pull request drops the previous one's files, in
  three separate ways: selecting directly, a list arriving with a different one
  open, and a failed read. Selecting the one already open keeps them.
- **Reviewing** — sends verdict and comment for the open request; re-reads the
  list rather than patching it; keeps a refusal without mistaking it for the
  list having failed; is not left marked in flight after a failure; does
  nothing with nothing open or outside Tauri.
- **The panel** — lists the files with their counts; marks the open one and
  opens another on click; says `binary` rather than showing a file that changed
  nothing; shows the host's sentence with a Try again; says so for a pull
  request that changes no files; refuses to submit a comment with nothing in
  it, and does not refuse an approval; still says merging is not built.
- **The confirmation**, both ways — it is asked before anything is posted and
  names the verdict rather than asking whether you are sure; **declining sends
  nothing**; confirming posts exactly the verdict and comment on screen. The
  declining test cannot pass vacuously, because the test beside it drives the
  same helper and asserts the call *was* made with exact arguments.

Two of these were written wrong first and the failures were worth keeping.
`mockResolvedValueOnce` for a failed read let the panel's own retry succeed and
assert nothing, and the error assertion then ran against the spinner in front of
the retry rather than the error behind it. Both are now what the panel actually
does: a persistent failure, awaited.

### The screen's existing promises — `requests.test.ts`

All still asserted and all still passing against the new code: no host's name
anywhere on the screen, no `fetch`/`XMLHttpRequest`/`WebSocket`/URL in it, no
token named in it, and no HTTP client linked into the webview.

**One assertion was rewritten rather than deleted.** `disables every action and
says what it needs` asserted that *every* button on the panel was disabled,
which was true while nothing could reach a host about one pull request and is
false by design now. It became `offers Review, and still says plainly that
merging is not built`, which keeps the rule the original was protecting: a
control that looks live and does nothing is worse than one that explains
itself. Whatever is still disabled must still carry a reason, and still must not
quote a work item identifier at the user.

## What is not covered, and why

**The two request functions' network paths.** `pull_request_files` and
`submit_review` are a URL, a status check and a call into `read_files`, which is
tested directly. A fake HTTP server would assert that a double written from the
same understanding as the code agrees with it — the shape
[[test-doubles-that-do-the-work-under-test]] warns about. The parts with
judgement in them (pagination stopping on a short page, the pre-send refusal,
the enterprise URL) are tested; the transport is `forge/http.rs`, which has its
own tests.

**Whether a real GitHub pull request renders.** No fixture is a live host. That
is the sweep, and `SWEEP-001` through `SWEEP-004` are written for a repository
the tester actually has.

## Recorded run

```
cargo test --workspace
 test result: ok. 465 passed; 0 failed   (spagitty-core)
 test result: ok. 68 passed; 0 failed    (spagitty)

cargo fmt --all --check     clean
cargo clippy --workspace --all-targets -- -D warnings    clean

npm run check
 COMPLETED 1036 FILES 0 ERRORS 0 WARNINGS 0 FILES_WITH_PROBLEMS

npm run test
 Test Files  74 passed (74)
      Tests  1882 passed (1882)
```

## Coverage

Both languages above the Amendment 10 floor of 70%.

```
cargo llvm-cov --workspace --ignore-filename-regex '(fixture|testing)\.rs'
 crates/spagitty-core/src/forge/review.rs   86.65% regions   85.66% lines
 TOTAL                                      82.79% regions   84.55% lines

npm run coverage
 All files      | % Stmts 86.21 | % Branch 75.05 | % Funcs 82.45 | % Lines 85.82
 lib/requests   | % Stmts 96.72 | % Branch 81.74 | % Funcs 95.50 | % Lines 99.07
```

`lib/requests` is broken out because it is the directory this item changed, and
because it is the number that made the case for the panel tests: with the store
tested and the panel not, it sat at 71.42% statements and **61.90% branches** —
under the floor for the code that had just been written, while the project
total stayed comfortably over it. The panel tests took it to 96.72% and 81.74%,
and lifted the project total rather than leaving it flat.
