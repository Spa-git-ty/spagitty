<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-017 — Automated tests

**Item:** [`agile/items/FEAT-017-forge-integration.md`](../items/FEAT-017-forge-integration.md)
**Plan:** [`agile/plans/FEAT-017-plan.md`](../plans/FEAT-017-plan.md)

Sixty-one tests. The shape that made them possible is in the plan: the mapping
from a host's JSON to a row is a **pure function**, so every answer a host can
send is a fixture rather than something met in production against somebody's
real account.

## Reading a remote

| Test | Layer | What it asserts |
| --- | --- | --- |
| `the_scp_form_git_writes_for_an_ssh_remote_is_understood` | `forge.rs` | `git@github.com:owner/repo.git` — the single most common remote URL in existence. |
| `every_other_form_git_accepts_is_understood_too` | `forge.rs` | `ssh://`, `https://`, `git://`, with and without `.git`, with a userinfo prefix, with surrounding whitespace. |
| `the_host_is_compared_without_case` | `forge.rs` | `GitHub.com` is `github.com`. |
| `a_repository_name_that_ends_in_git_keeps_its_name` | `forge.rs` | One `.git` comes off. A repository genuinely called `dotgit` and one called `repo.git` both survive. |
| `a_github_enterprise_host_is_read_as_github` | `forge.rs` | And is asked at `/api/v3`, not at `api.<host>`. |
| `github_dot_com_is_answered_by_its_own_api_host` | `forge.rs` | The other half of the same decision. |
| `a_remote_that_is_not_a_forge_is_not_an_error` | `forge.rs` | A path on a NAS, a `file://` URL, another host. Nothing to read is not something wrong. |
| `a_url_that_is_not_a_repository_root_is_refused_rather_than_guessed_at` | `forge.rs` | A `tree/main` URL pasted as a remote. Two segments is a repository; more is a page about one. |
| `origin_is_the_remote_a_forge_is_read_from` | `forge.rs` | Even with an `upstream` listed first. |
| `a_single_remote_under_another_name_is_used` | `forge.rs` | One remote called `fork` is unambiguous. |
| `several_remotes_and_no_origin_is_answered_with_nothing` | `forge.rs` | Reading somebody's fork's pull requests because it sorted first is worse than saying nothing. |

## Telling failures apart

| Test | Layer | What it asserts |
| --- | --- | --- |
| `a_refused_token_is_told_apart_from_a_repository_it_cannot_see` | `forge.rs` | 401 and 404 are different sentences. |
| `a_spent_rate_limit_is_told_apart_from_a_permission_problem` | `forge.rs` | **Both arrive as 403.** Reporting the second as the first sends the reader away to wait for something that will never change. |
| `a_retry_after_header_is_enough_to_call_it_rate_limiting_and_it_says_when` | `forge.rs` | And the answer carries the when. |
| `a_host_that_says_nothing_useful_still_names_the_status` | `forge.rs` | A 500 is reported as a 500 rather than swallowed. |

## The one call site

| Test | Layer | What it asserts |
| --- | --- | --- |
| `a_plaintext_url_is_refused_before_anything_is_sent` | `forge/http.rs` | A token must never travel in the clear, and a remote configured with `http://` must not be the way it does. Refused here rather than left to a redirect the host controls. |
| `a_plaintext_url_is_refused_on_the_way_out_as_well` | `forge/http.rs` | The POST path too. |
| `a_host_that_does_not_resolve_is_reported_as_offline_not_as_a_status` | `forge/http.rs` | There is no status to interpret, and "could not reach it" is a different thing to say. |
| `a_response_never_prints_its_body` | `forge/http.rs` | A body carries a token back in an error message, and a `Debug` in a log line is how a secret escapes. |
| `the_user_agent_names_the_application_and_its_version` | `forge/http.rs` | And nothing about the machine. |

## Mapping a host's answer

| Test | Layer | What it asserts |
| --- | --- | --- |
| `a_pull_request_arrives_in_the_shape_the_screen_renders` | `forge/github.rs` | The whole row, against the shape FEAT-010 fixed before there was anything behind it. |
| `every_review_decision_github_can_send_has_a_word_the_screen_knows` | `forge/github.rs` | Including one the host has not invented yet, which reads as "no reviewers" rather than panicking. |
| `a_repository_that_runs_no_checks_shows_no_checks` | `forge/github.rs` | Null, not failing. "This has not passed" about a repository with no CI is an accusation the host never made. |
| `a_check_that_fell_over_reads_the_same_as_one_that_failed` | `forge/github.rs` | `ERROR` and `FAILURE` are different to GitHub and the same to somebody deciding whether to merge. |
| `a_check_still_running_says_so` | `forge/github.rs` | `PENDING` and `EXPECTED`. |
| `a_merge_github_has_not_worked_out_yet_is_not_a_merge_it_refused` | `forge/github.rs` | `UNKNOWN` is null. Rendering it as "cannot merge" would be wrong for a few seconds every time somebody pushes. |
| `a_review_requested_from_you_puts_it_at_the_top_and_says_why` | `forge/github.rs` | The ordering the whole screen is built around, and the reason is carried rather than recomputed. |
| `changes_requested_on_your_own_pull_request_is_yours_too` | `forge/github.rs` | The queue people actually lose things in. |
| `your_own_pull_request_waiting_on_somebody_else_is_not_yours` | `forge/github.rs` | The other side of it, so "needs you" keeps meaning something. |
| `nothing_needs_you_when_nobody_knows_who_you_are` | `forge/github.rs` | No login, no ordering — rather than everything at the top. |
| `a_deleted_author_still_gets_a_row` | `forge/github.rs` | A real thing to find in a long-lived repository. |
| `a_node_with_no_number_is_skipped_rather_than_invented` | `forge/github.rs` | A row with a zero for a number is a row no link opens. |
| `an_empty_list_is_an_empty_list_and_not_an_error` | `forge/github.rs` | Nothing open is an answer. |
| `a_graphql_error_is_reported_even_though_it_arrived_with_a_200` | `forge/github.rs` | GraphQL reports its own failures in the body with a successful status, so a 200 is not an answer until the errors are looked at. |
| `a_body_that_is_not_json_is_reported_rather_than_panicked_on` | `forge/github.rs` | A maintenance page. |
| `an_answer_with_no_list_in_it_says_so` | `forge/github.rs` | Shape checked before it is walked. |
| `the_time_is_read_without_a_date_dependency` | `forge/github.rs` | Against values computed elsewhere, including a leap day and the leap-century year 2000 — a hand-written calendar is exactly the thing to get wrong. |
| `a_time_that_does_not_parse_is_unknown_rather_than_wrong` | `forge/github.rs` | Zero, which the screen renders as unknown. |
| `an_enterprise_installation_is_asked_at_its_own_graphql_path` | `forge/github.rs` | `/api/graphql`, **not** `/api/v3/graphql` — v3 is the REST root. |
| `the_query_asks_for_everything_the_row_needs_and_nothing_else` | `forge/github.rs` | The argument for GraphQL is that one request fills the whole row; a field silently dropped from the query would default instead. It also asserts the query contains no `mutation`. |

## Where the token lives

| Test | Layer | What it asserts |
| --- | --- | --- |
| `two_accounts_on_one_host_are_two_different_entries` | `forge/keychain.rs` | |
| `one_login_on_two_hosts_is_two_different_entries` | `forge/keychain.rs` | Handing an enterprise token to `github.com` would be sending a credential to a service it was never issued for. |
| `the_key_carries_both_parts_so_neither_can_be_confused_for_the_other` | `forge/keychain.rs` | |
| `the_stored_file_carries_no_token` | `src-tauri/src/accounts.rs` | The point of the whole split, asserted on the serialised form — a field added later fails here before it ever reaches a disk. |
| `no_file_means_no_accounts_connected` / `a_hand_edited_file_that_is_not_a_list_does_not_stop_the_application` | `src-tauri/src/accounts.rs` | The same treatment the repository list gets. |
| `reconnecting_the_same_account_replaces_it_rather_than_listing_it_twice` | `src-tauri/src/accounts.rs` | |
| `two_logins_on_one_host_are_two_accounts` / `one_login_on_two_hosts_is_two_accounts` | `src-tauri/src/accounts.rs` | |
| `disconnecting_removes_that_one_and_leaves_the_rest` / `disconnecting_something_that_is_not_connected_changes_nothing` | `src-tauri/src/accounts.rs` | |
| `a_repository_is_read_with_the_account_for_its_own_host` | `src-tauri/src/accounts.rs` | |

## The screen

| Test | Layer | What it asserts |
| --- | --- | --- |
| `reads the repository first, and only then the pull requests` | `src/lib/requests/store.test.ts` | |
| `does not ask a host about a repository that is not on one` | `src/lib/requests/store.test.ts` | The commonest case for anybody with a repository on a NAS. Nothing to fetch is not a failed fetch. |
| `opens the first request so the detail panel is not empty beside a list` | `src/lib/requests/store.test.ts` | |
| `keeps the open request across a re-read while it is still there` | `src/lib/requests/store.test.ts` | |
| `moves on when the request that was open has been merged away` | `src/lib/requests/store.test.ts` | |
| `surfaces the host's own sentence rather than a generic failure` | `src/lib/requests/store.test.ts` | Four failures are four decisions; flattening them to "could not load" throws that away. |
| `says a failure is a failure rather than showing a stale list` | `src/lib/requests/store.test.ts` | |
| `reports while it is reading and stops when it is done` | `src/lib/requests/store.test.ts` | |
| `ignores a slow read that lost the race to a newer one` | `src/lib/requests/store.test.ts` | Switching repository quickly. |
| `does nothing at all outside the application` | `src/lib/requests/store.test.ts` | `npm run dev` in a plain browser has no backend to ask. |
| `separates what is waiting on you from what is waiting on others` | `src/lib/requests/store.test.ts` | |
| `says no account is connected, and offers the two fields that connect one` | `src/lib/settings/sections.test.ts` | |
| `never puts the token in a field anyone can read` | `src/lib/settings/sections.test.ts` | `type="password"`, `autocomplete="off"`. |
| `will not connect with an empty token or an empty host` | `src/lib/settings/sections.test.ts` | The button starts dead rather than sending an empty secret to a host. |
| `lists a connected account by host and login, and offers to disconnect it` | `src/lib/settings/sections.test.ts` | |
| `says what leaves the machine, rather than that nothing does` | `src/lib/settings/sections.test.ts` | The promise narrowed; a sentence that stayed absolute would be one that had become false. |

## The promise the screen makes

| Test | Layer | What it asserts |
| --- | --- | --- |
| `uses no host's name anywhere in the screen` | `src/lib/requests/requests.test.ts` | Unchanged. The vocabulary rule, asserted rather than intended. |
| `makes no network call from the webview, in any form` | `src/lib/requests/requests.test.ts` | A `fetch` in a screen would put a bearer token in the devtools network tab of anybody who opened it. |
| `holds no token, anywhere in the screen` | `src/lib/requests/requests.test.ts` | New. The word does not appear in the store, the rows, the detail panel or the route. |
| `links no HTTP client into the webview` | `src/lib/requests/requests.test.ts` | The half of the old promise that still holds absolutely. |
| `links exactly one HTTP client into the application, and only in the core` | `src/lib/requests/requests.test.ts` | **What the old test became.** One client, the one that was chosen, and none in the workspace root or the Tauri layer. |
| `makes its requests from exactly one file` | `src/lib/requests/requests.test.ts` | Walks every `.rs` file in the core and asserts only `forge/http.rs` names `ureq`. A second call site has to be added here. |

## What is not covered

- **A real request to a real host.** Every test above stops at the boundary:
  the mapping is exercised with fixtures and the call site is exercised for the
  things it refuses. A test that hit `api.github.com` would need a token in CI,
  would fail when GitHub was slow, and would spend a rate limit to prove
  something the fixtures already prove. SWEEP-017-01 through -04 cover the live
  path by hand.
- **The keychain round trip.** Needs a running secret service, a session bus and
  an unlocked keyring, none of which a CI container has — and a test that
  silently skipped when they were missing is a test that never runs anywhere.
  SWEEP-017-05.
- **GitLab.** Not written. The enum has one arm.
- **Pagination.** Fifty, newest-updated first, with no second page.
