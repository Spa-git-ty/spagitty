<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-019 — Automated tests

**Item:** [`agile/items/FEAT-019-commit-signing.md`](../items/FEAT-019-commit-signing.md)
**Plan:** [`agile/plans/FEAT-019-plan.md`](../plans/FEAT-019-plan.md)

## What was written

| Test | Layer | What it asserts |
| --- | --- | --- |
| `signing_is_off_when_nothing_sets_it` | `crates/spagitty-core/src/signing.rs` | The default, and that "unset" is said rather than "false". |
| `a_repository_that_signs_says_so_and_says_where_from` | `crates/spagitty-core/src/signing.rs` | The effective value and its origin, which is what tells a reader which file to edit. |
| `a_repository_can_turn_signing_off_against_a_global_yes` | `crates/spagitty-core/src/signing.rs` | The reason `set` writes `false` rather than unsetting: a local value has to be able to say "not here". |
| `every_spelling_git_accepts_for_a_boolean_is_accepted_here` | `crates/spagitty-core/src/signing.rs` | `yes`, `on`, `1`, `off`, `0`, and case. A config Spagitty read differently from git would be a screen that lies. |
| `a_bare_key_with_no_value_is_true_as_it_is_on_a_command_line` | `crates/spagitty-core/src/signing.rs` | `[commit]\n\tgpgsign` with no value. |
| `a_value_that_is_not_a_boolean_is_left_for_git_to_complain_about` | `crates/spagitty-core/src/signing.rs` | The read describes the configuration rather than refusing it — refusing would take the screen away too. |
| `the_format_decides_which_program_git_would_run` | `crates/spagitty-core/src/signing.rs` | `gpg`, `ssh-keygen`, `gpgsm`. |
| `a_configured_program_wins_over_the_default_for_its_format` | `crates/spagitty-core/src/signing.rs` | `gpg.ssh.program`. |
| `an_unknown_format_reads_as_openpgp_which_is_gits_default` | `crates/spagitty-core/src/signing.rs` | git's own fallback, not an error. |
| `ssh_signing_with_no_key_is_a_problem_named_before_it_happens` | `crates/spagitty-core/src/signing.rs` | The pre-flight the item asked for: this cannot work and is said in advance. |
| `ssh_signing_with_a_key_gets_as_far_as_looking_for_the_program` | `crates/spagitty-core/src/signing.rs` | And the key clears that particular problem. |
| `a_signing_program_that_is_not_installed_is_named` | `crates/spagitty-core/src/signing.rs` | The program's name reaches the message, which is the whole point of naming it. |
| `signing_that_is_off_has_no_problem_to_report` | `crates/spagitty-core/src/signing.rs` | A signer that will not be used cannot fail to be used; a warning would be noise on every commit. |
| `an_empty_program_setting_falls_back_to_the_default` | `crates/spagitty-core/src/signing.rs` | An empty string is not a program name. |
| `a_hook_refusing_a_commit_is_not_reported_as_a_signing_failure` | `crates/spagitty-core/src/signing.rs` | The classifier's load-bearing case. A failed commit is usually a failed commit. |
| `gits_own_signing_failure_is_reported_as_one_and_names_the_program` | `crates/spagitty-core/src/signing.rs` | `Error::Signing`, carrying git's words and the program. |
| `a_failure_that_is_not_gits_is_left_exactly_as_it_was` | `crates/spagitty-core/src/signing.rs` | The classifier only ever touches `Error::Git`. |
| `an_ordinary_commit_carries_no_signature` | `crates/spagitty-core/src/signing.rs` | Against the woven fixture. |
| `a_commit_with_a_gpgsig_header_reads_as_signed` | `crates/spagitty-core/src/signing.rs` | A commit object written by hand with `git hash-object`. A real signature would need a key, an agent and a passphrase, none of which a fixture may have — and the header is the whole of what this reports. |
| `writing_the_key_turns_signing_on_and_off_in_the_repository` | `crates/spagitty-core/src/signing.rs` | Round-trip through `git config`, **asserted with `git config` itself** — git is the one that reads this key, so git is what has to agree. |
| `a_key_the_build_does_not_know_is_ignored_rather_than_fatal` | `src-tauri/src/settings.rs` | Extended: `signCommits` is now such a key, and a settings file written before this still carrying it must not stop the application. |
| `the_stored_keys_are_the_camel_case_names_the_screen_uses` | `src-tauri/src/settings.rs` | Extended with the inverse: `signCommits` must **not** be written again, or the second switch comes back. |

Every existing test that builds a `GraphRow` or a `CommitDetail` carries
`signed` now. That is fixture churn rather than new coverage, and it is listed
so the diff is not mistaken for behaviour changing.

## What is not covered

- **The two pieces of presentation that are not built.** The pre-commit notice
  and the Graph/Diff signed indicator have no tests because they have no code;
  see the plan's *What is not built yet*. `SWEEP-019-04` and `-05` are written
  and will fail until they exist, which is the honest state to leave them in.
- **A real signature, made by a real signer.** Would need a key, an agent and a
  passphrase in CI. What is tested instead is every decision Spagitty makes
  around the signer, and the header it leaves behind.
- **`--gpg-sign` actually reaching git.** The argument is assembled in
  `shell::commit`; asserting it end to end means a commit that really signs.
  SWEEP-019-02 covers it by hand.
- **Verification.** Deliberately not built. See the plan.
