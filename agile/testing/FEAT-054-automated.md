<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-054 — Automated tests

**Item:** [`agile/items/FEAT-054-update-check.md`](../items/FEAT-054-update-check.md)
**Plan:** [`agile/plans/FEAT-054-plan.md`](../plans/FEAT-054-plan.md)

The verdict is a pure function of the answer and the build's own tag, so every
case is a fixture.

| Test | Layer | What it asserts |
| --- | --- | --- |
| `a_build_older_than_the_latest_release_is_told_so` | `crates/spagitty-core/src/update.rs` | The ordinary case, with the tag and the link. |
| `a_build_that_is_the_latest_release_is_left_alone` | `crates/spagitty-core/src/update.rs` | |
| `a_development_build_is_never_out_of_date` | `crates/spagitty-core/src/update.rs` | No tag means nothing to be behind, and it still reports what the latest is. |
| `the_comparison_is_the_tag_and_not_the_version_number` | `crates/spagitty-core/src/update.rs` | **The one that would have been got wrong quietly.** `0.1.0 == 0.1.0` across four releases, and a version comparison would say "up to date" forever. |
| `a_release_with_no_tag_is_an_error_rather_than_an_empty_answer` | `crates/spagitty-core/src/update.rs` | Empty and missing both. |
| `a_body_that_is_not_json_is_reported_rather_than_panicked_on` | `crates/spagitty-core/src/update.rs` | A maintenance page. |
| `a_url_the_host_did_not_send_falls_back_to_the_releases_page` | `crates/spagitty-core/src/update.rs` | Rather than building one from the tag, which guesses at a scheme the host can change. |
| `a_url_that_is_not_https_is_refused_in_favour_of_the_one_we_know` | `crates/spagitty-core/src/update.rs` | `javascript:`, `file:` and `http:`. The answer ends up in front of a person, and that is what this shape of trust is for. |
| `the_endpoint_is_this_project_and_is_not_configurable` | `crates/spagitty-core/src/update.rs` | A check that could be pointed elsewhere is a way to hand somebody a different program. |
| `an_empty_token_is_an_unauthenticated_request_rather_than_an_empty_bearer` | `crates/spagitty-core/src/forge/http.rs` | The one change to the shared call site. |
| `asking_before_a_history_rewrite_is_on_by_default` | `src-tauri/src/settings.rs` | Extended: the update check is the other default-on preference, and the field says why it earns it. |
| `settings_read_back_as_they_were_written` / `the_stored_keys_are_the_camel_case_names_the_screen_uses` | `src-tauri/src/settings.rs` | Re-pinned for the new key. |
| `reports what the project answered` | `src/lib/settings/store.test.ts` | |
| `asks when the button is pressed, whatever the startup preference says` | `src/lib/settings/store.test.ts` | The button is somebody asking. One that silently did nothing because of a setting on the same screen would be worse than no button. |
| `keeps a failed check out of the way of the identity fields` | `src/lib/settings/store.test.ts` | It is outside `busy`, so a network failure does not disable Save. |
| `refuses to ask twice at once` | `src/lib/settings/store.test.ts` | |
| `does nothing outside the application` | `src/lib/settings/store.test.ts` | |
| `forgets what it found when the screen is cleared` | `src/lib/settings/store.test.ts` | |
| `says nothing has been checked before anything has` | `src/lib/settings/sections.test.ts` | |
| `says what leaves the machine, beside the switch that stops it` | `src/lib/settings/sections.test.ts` | The sentence is the price of defaulting this on, so it is asserted rather than intended. |
| `reports a newer release with a link that can be copied` | `src/lib/settings/sections.test.ts` | |
| `says a build compiled here is not out of date` | `src/lib/settings/sections.test.ts` | And offers no download — the copy button is what appears only for a real newer release. |
| `says so when there is nothing newer` | `src/lib/settings/sections.test.ts` | |
| `shows the failure rather than a stale answer` | `src/lib/settings/sections.test.ts` | |

## What is not covered

- **A real request to `api.github.com`.** Same reasoning as FEAT-017: a test
  that hit it would need the network, would fail when GitHub was slow, and would
  prove what the fixtures already prove. SWEEP-054-01.
- **The startup check firing.** It lives in the layout's `onMount`, which the
  suite does not mount. SWEEP-054-02 and -03 cover both the on and off case,
  and the off case is the one that matters.
- **`SPAGITTY_RELEASE` actually being baked in.** That is the release workflow,
  and it is only true of a CI build. SWEEP-054-05.
