<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-007 — Automated tests

## Run result

```
cargo test --workspace     216 passed, 0 failed   (197 core, 19 tauri)
npm test                   525 passed, 0 failed   (31 files)
npm run check              928 files, 0 errors
cargo fmt --all --check    clean
cargo clippy --workspace --all-targets -- -D warnings   clean
```

## Coverage against the Amendment 10 floor of 70%

| Tree | Statements / Regions | Branches | Functions | Lines |
| --- | --- | --- | --- | --- |
| Frontend (`src/lib/**`) | 96.47% | 84.62% | 94.44% | 97.28% |
| `src/lib/search/**` | 92.66% | 72.95% | 96.66% | 95.03% |
| Rust workspace | 87.80% | — | 76.77% | 86.53% |
| `crates/gitlumiere-core/src/search.rs` | 94.76% | — | 88.10% | 96.39% |
| `crates/gitlumiere-core/src/blame.rs` | 95.68% | — | 83.72% | 95.86% |
| `src-tauri/src/search_worker.rs` | 0.00% | — | 0.00% | 0.00% |

`search_worker.rs` is a Tauri thread that emits events to a webview, the same
shape as `graph_worker.rs`, which measures 0% for the same reason: it cannot be
exercised without a running application. What it *does* — token-carrying
batches, cancellation on a newer query — is asserted in the frontend against
mocked events, and in the sweep against the real thing (SWEEP-1I-06).

## Rust — `search.rs`, 15 tests

Every filter is compared against what `git log` returns for the same question.
The comparison uses `--branches --remotes HEAD` rather than `--all`, because
`--all` includes `refs/stash` and `graph::all_tips` does not — the two sides
have to be asked about the same history for the comparison to mean anything.
Results are compared as sets rather than sequences: both orders are newest
first, and there is a separate test for that, but a fixture builds its commits
inside one second and two commits sharing a timestamp have no defined order
relative to each other.

| Test | Asserts |
| --- | --- |
| `an_author_filter_returns_what_git_log_author_returns` | Against `git log -i --author=` — acceptance criterion 1 |
| `a_message_filter_returns_what_git_log_grep_returns` | Against `git log -i --fixed-strings --grep=` |
| `a_message_filter_reads_the_body_and_not_only_the_subject` | `--grep` looks at the whole message and so does this |
| `a_path_filter_returns_what_git_log_for_that_path_returns` | Four paths, each against `git log -- <path>`. This is the test that pins the simplification rule: a commit TREESAME to *any* parent is skipped, which is what stops a merge being listed for a change it only carried across. Comparing against the first parent alone would list merges git does not |
| `a_path_that_no_commit_touched_returns_nothing_rather_than_everything` | The failure mode where an unmatched filter silently stops filtering |
| `a_date_range_returns_what_git_log_since_and_until_return` | Against `git log --since=`, inclusive at the boundary the way git's is |
| `filters_compose_as_and` | Adding a filter only ever removes rows, and two filters no commit satisfies together return nothing rather than either one's rows — criterion 2 |
| `matching_ignores_case` | |
| `a_blank_filter_is_not_a_filter` | A chip left empty behaves as if it were not there, rather than matching everything and looking deliberate |
| `results_are_newest_first_and_numbered_by_position_in_the_result` | `index` is position in the result, not in history |
| `a_row_carries_what_the_screen_draws` | Name, email, initials, short id and the refs the commit carries |
| `the_sink_can_stop_the_walk` | What makes a query cancellable — criterion 3 |
| `a_repository_with_no_commits_is_refused_rather_than_searched` | |
| `an_empty_query_says_so` | |
| `the_narrowest_filter_is_named_for_an_empty_result_to_point_at` | Path beats message beats author beats date — criterion 4 |

## Rust — `blame.rs`, 17 tests

| Test | Asserts |
| --- | --- |
| `every_line_is_attributed_to_the_commit_git_blames_it_on` | Every `(line, commit)` pair against `git blame --line-porcelain`, line for line — acceptance criterion 5 |
| `the_text_of_each_line_is_the_file_itself` | The strip shows the file, not a re-rendering of it |
| `lines_arrive_in_line_order_rather_than_hunk_order` | The strip is read top to bottom |
| `a_row_carries_who_and_when_and_what_the_commit_said` | |
| `blaming_an_older_revision_answers_for_that_revision` | An annotated tag resolves to the commit it points at, which is what the peel is for |
| `an_empty_revision_means_head` | |
| `a_binary_file_says_so_rather_than_rendering_empty` | Criterion 6. An empty list reads as a file nobody has ever touched |
| `a_path_that_is_not_in_that_revision_says_so` | Both an unknown path and one that did not exist yet at that tag |
| `a_directory_is_not_a_file_to_blame` | |
| `a_file_with_no_lines_has_nothing_to_attribute` | |
| `an_unknown_revision_is_an_error_rather_than_a_refusal` | A refusal says "this file cannot be blamed"; a bad revision is a different problem and the caller's |
| `a_renamed_file_carries_where_the_line_lived_before` | Git's `filename` header names the path at the commit that introduced the line |
| `the_same_filename_is_not_a_rename` | |
| `a_header_the_parser_does_not_know_is_skipped_rather_than_refused` | Git adds fields over time |
| `content_arriving_without_a_header_is_dropped_rather_than_misattributed` | |
| `splitting_lines_treats_a_trailing_newline_as_ending_the_last_line` | |
| `a_nul_byte_after_the_sniff_window_is_still_text` | |

## Frontend

| File | What the tests assert |
| --- | --- |
| `search/store.test.ts` (28) | An empty query is refused rather than run; fields are sent trimmed and a whitespace-only field is not a filter; a date becomes seconds with `until` covering the whole day, and a date that is not a date is ignored rather than sent as nonsense; one chip per applied filter; removing a chip clears its field and re-runs what is left, and removing the last one clears the results instead of running nothing; a failure to start is recorded; rows appear as they arrive rather than at the end; rows and done events from a superseded query are dropped; a cancelled walk is not complete, so its count is not the whole answer; a walk failure reaches the screen; the narrowest filter named is the one the *rows* answer, not what is typed now; opening a result reads its commit, drops a superseded read, records a failure, and is cleared by a new query; blame reads a file at a revision, passes an empty revision through, carries a refusal rather than an empty list, refuses to blame nothing, drops a superseded read and records a failure; leaving stops the walk and forgets both the query and the results |
| `search/panes.test.ts` (21) | Search is disabled while nothing is asked; chips appear per filter and remove their own; typing a field is what the chip reflects; a result row carries author, time, short id and its refs; a plain click and `↵` open the commit while alt-click and `⌥↵` open the diff — criterion 8; the open result is marked; the blame strip says what it is for before being asked, groups a run of lines from one commit into one block because a blame is read by change rather than by line, names a binary file, a missing path and an oversized one, shows where a line lived before a rename, and shows a read failure; the detail card shows message, person and files, offers the full diff, and shows a read failure rather than an empty card |

## Not covered by automated tests

- **`⌘F` from any screen** (criterion 7) is a window-level key handler in
  `src/routes/+layout.svelte` that navigates. Testing it would mean mounting the
  whole layout; SWEEP-1I-09 covers it, including the focus it lands with.
- **Streaming against a real repository** (criterion 3) is asserted here against
  mocked events. That a large repository actually paints its first results
  before the walk ends is SWEEP-1I-06.
- `src/routes/search/+page.svelte` is outside the coverage scope, like every
  screen shell.

## Recorded deviation

Blame shells out to `git`. `gix::blame` 0.16 — the newest published version —
panics rather than returning an error on a file blamed at a merge commit whose
history contains an intervening commit that left the file alone, under every
diff algorithm and both rename settings. Bisected against the project's own
`Fixture::woven`; a linear history and a simple merge both work, so the shape
that breaks it is ordinary rather than exotic. Raised with the author, who chose
the shell route; the exception, its reason and its end condition are recorded on
`shell::blame` and in `docs/architecture.md`. Criterion 5 holds by construction
now, since GitLumiere and `git blame` are the same program.
