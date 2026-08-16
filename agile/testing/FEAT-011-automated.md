<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-011 — Automated tests

## Run result

```
cargo test --workspace     264 passed, 0 failed   (230 core, 34 tauri)
npm test                   645 passed, 0 failed   (37 files)
npm run check              944 files, 0 errors
cargo fmt --all --check    clean
cargo clippy --workspace --all-targets -- -D warnings   clean
```

Up from 236 Rust and 592 frontend at FEAT-010: 28 Rust tests (13 identity,
7 settings, 8 about) and 53 frontend tests.

## Coverage against the Amendment 10 floor of 70%

| Tree | Regions / Statements | Branches | Functions | Lines |
| --- | --- | --- | --- | --- |
| Rust workspace | 87.33% | — | 76.32% | 86.30% |
| `crates/gitlord-core/src/identity.rs` | 97.31% | — | 92.00% | 96.89% |
| `src-tauri/src/about.rs` | 100.00% | — | 100.00% | 100.00% |
| `src-tauri/src/settings.rs` | 59.84% | — | 66.20% | 66.20% |
| Frontend (`src/lib/**`) | 96.15% | 82.57% | 93.83% | 96.98% |
| `src/lib/settings/**` | 95.06% | 73.27% | 93.20% | 97.04% |

`settings.rs` is below the floor on its own and is the same shape as
`recents.rs` (72.78%), which is below it for the same reason: `load`, `save`
and `file` need a `tauri::AppHandle` to resolve the config directory, and one
cannot be built without starting an application. What is testable is the part
that can be wrong — the parse, the defaults and the stored key names — and that
is fully covered. The floor is measured across the workspace, which is at
86.30%.

## Rust — `crates/gitlord-core/src/identity.rs`, 13 tests

### Reading, per source

The fold is tested against configuration layers built with a chosen
`gix::config::Source`, so the whole cascade is exercised without a real
`~/.gitconfig` anywhere near the test.

| Test | Asserts |
| --- | --- |
| `an_identity_set_nowhere_is_unset_rather_than_blank` | `Origin::Unset`, not an empty string |
| `a_global_identity_is_reported_as_global` | Criterion 1 |
| `a_repository_override_wins_and_the_global_value_is_still_reported` | Criterion 1 — the override *and* what it hides, which is the reason both scopes are shown |
| `a_system_identity_is_named_as_system_rather_than_as_a_scope_we_write` | A value from `/etc/gitconfig` is not reported as global; editing the global field would not change it |
| `an_identity_from_the_environment_says_so` | |
| `the_last_occurrence_in_one_file_wins_the_way_git_config_get_does` | The resolution rule matches `git config --get` |
| `reading_a_repository_agrees_with_git_config` | Criterion 1, against a fixture and `git config` itself |

### Writing

| Test | Asserts |
| --- | --- |
| `each_scope_maps_to_the_flag_git_config_takes` | `--global` / `--local`, `user.name` / `user.email` |
| `writing_locally_produces_what_git_config_local_would` | Criterion 2 |
| `a_write_touches_only_the_scope_it_was_given` | Criterion 2 — the quiet mistake the module is shaped around |
| `clearing_a_value_unsets_the_key_rather_than_writing_an_empty_string` | Criterion 3, by reading `.git/config` and asserting the key is gone |
| `clearing_something_that_was_never_set_is_not_an_error` | `git config --unset` exits 5 for an absent key; "already gone" is the outcome asked for |
| `surrounding_whitespace_is_trimmed_so_what_is_read_back_is_what_was_saved` | |

**Writing to the global scope is deliberately not exercised.** A test that ran
`git config --global` would write to whichever `~/.gitconfig` the test runner
has, which is a developer's own identity on their own machine. No test in this
repository may do that. What is covered instead is the flag mapping — the only
thing that differs between the two paths — and the local write end to end.
SWEEP-1K-04 covers the global write by hand.

## Rust — `src-tauri/src/settings.rs`, 7 tests

| Test | Asserts |
| --- | --- |
| `a_missing_file_reads_as_the_defaults` | The file does not exist until something is toggled |
| `asking_before_a_history_rewrite_is_on_by_default` | The one confirmation defaults on; the two that change behaviour default off |
| `a_hand_edited_file_that_is_not_settings_does_not_stop_the_application` | Five kinds of corrupt file |
| `a_file_from_an_older_build_keeps_what_it_carries_and_defaults_the_rest` | Criterion 4's forward-compatibility half |
| `a_key_the_build_does_not_know_is_ignored_rather_than_fatal` | Going back a version does not cost the settings that still apply |
| `settings_read_back_as_they_were_written` | Criterion 4's round trip |
| `the_stored_keys_are_the_camel_case_names_the_screen_uses` | The wire contract with `src/lib/types.ts` |

## Rust — `src-tauri/src/about.rs`, 8 tests

| Test | Asserts |
| --- | --- |
| `the_build_stamps_in_a_version_a_commit_and_the_license` | Criterion 5, criterion 7 |
| `this_build_carries_a_generated_list_covering_both_trees` | Criterion 6 — this build's own list is generated and covers Rust and npm. If it fails, the binary under test cannot say what it is made of |
| `the_list_names_the_library_the_reading_is_done_with` | `gix` is present with `MIT OR Apache-2.0`; its absence would mean the dependency walk found the wrong set |
| `nothing_that_only_builds_the_application_is_listed_as_part_of_it` | Only normal dependencies are listed — build dependencies are not distributed |
| `no_development_only_npm_package_is_listed` | `vite`, `vitest`, `svelte-check`, `typescript` are absent |
| `a_build_that_could_not_generate_the_list_says_so_rather_than_showing_none` | The degradation, which is untested code otherwise |
| `a_list_that_cannot_be_read_degrades_instead_of_failing_the_command` | Four kinds of unreadable file; the version, commit and license must survive a broken list |
| `a_package_that_declares_no_license_is_listed_as_not_declared` | An incomplete list that looks complete is the worse failure |

## Frontend — `src/lib/settings/`, 53 tests

### `describe.test.ts`, 15 tests

The sentences the screen says about a value, kept out of the markup because
they are the part that can be wrong: naming the wrong file sends someone to
edit something that will not change anything.

| Group | Asserts |
| --- | --- |
| `describeOrigin` | A distinct sentence per origin; both unwritable sources say so; an unset identity is described as stopping a commit rather than as empty |
| `describeOverride` | Warns when the global field is edited and the repository overrides it; silent when the edited scope is the one in effect; warns for system and environment in either scope; silent for unset, which is not an override |
| `describeLicense` / `undeclared` | "not declared" rather than a blank |
| `matching` | Empty filter is everything; matches name and license, case insensitively; finds undeclared packages by the words shown |

### `store.test.ts`, 23 tests

| Group | Asserts |
| --- | --- |
| `load` | All four reads in one pass; fields filled from the scope being edited; **About survives an identity failure and the identity survives a license failure** — the sections are independent because their storage is; nothing is asked for outside the Tauri webview; the global scope is fallen back to with no repository (criterion 8) |
| `scope` | The local scope is refused with no repository; changing scope refills the fields, so a value typed against one file cannot be saved into the other; a scope holding nothing shows an empty field |
| `saving` | The chosen scope is what is sent (criterion 2); the empty string is sent through, which is what unsets (criterion 3); a failed write keeps what was typed; a second write does not start while one is running |
| `toggles` | The whole object is stored; a failed write puts the switch back and says why; the defaults match Rust's |
| `sections` | Opens on You; follows a fragment, which is how Pull requests reaches Accounts; an unknown fragment changes nothing |

### `sections.test.ts`, 15 tests

| Component | Asserts |
| --- | --- |
| `IdentitySection` | Shows each value and its origin; Save is disabled until the field differs; the write names the scope the chips show; says why the local scope is not offered with no repository; warns that a repository override is what will be committed with |
| `BehaviourSection` | Each toggle names the item that will honour it; flipping stores the whole object; the stored state of all three is shown |
| `AppearanceSection` | The theme in use is marked and the other one applies on click |
| `AccountsSection` | Says no account is connected, and that FEAT-017 connects one |
| `AdvancedSection` | **Keeps everything the About footer carried** — version, commit, license, trademark notice (criterion 7); lists both trees and names an undeclared package; filters both lists; says the list was not generated rather than showing an empty one; still shows the version and commit when the list is missing |

## Not covered by automated tests

- **Writing to the global scope** (criterion 2's other half) — see above.
  SWEEP-1K-04.
- **Persisting across a restart** (criterion 4) needs a restart. The round trip
  through the file format is covered; the file actually being in the config
  directory is SWEEP-1K-08.
- **The commit matching `git rev-parse HEAD` of the source** (criterion 5)
  cannot be asserted from inside the build that stamped it. SWEEP-1K-11.
- **The rail entry no longer reaching a `ScreenStub`** is navigation through the
  app shell; SWEEP-1K-01.
- `src/routes/settings/+page.svelte` is outside the coverage scope, like every
  screen shell. Its logic — which section a fragment selects — lives in the
  store and is covered there.
