<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-050 — Automated tests

**Item:** [`agile/items/FEAT-050-reflog-view.md`](../items/FEAT-050-reflog-view.md)
**Plan:** [`agile/plans/FEAT-050-plan.md`](../plans/FEAT-050-plan.md)

## What was written

| Test | Layer | What it asserts |
| --- | --- | --- |
| `head_has_a_log_of_everything_that_moved_it` | `crates/spagitty-core/src/reflog.rs` | A fixture with commits has a HEAD reflog, and it is not empty. |
| `entries_are_newest_first_and_numbered_from_zero` | `crates/spagitty-core/src/reflog.rs` | `HEAD@{0}` is the newest. Any other order puts the number and the row out of step, which is the one thing this screen cannot get wrong. |
| `each_entry_says_where_the_ref_moved_from_and_to` | `crates/spagitty-core/src/reflog.rs` | Both ids are the real ones from before and after a commit, and the short form is the first seven characters. |
| `the_operation_is_the_word_before_the_colon` | `crates/spagitty-core/src/reflog.rs` | `commit`, with the subject still in the message. |
| `a_rebase_groups_under_one_operation_however_git_labels_the_step` | `crates/spagitty-core/src/reflog.rs` | `rebase (finish)` and `rebase (pick)` both give `rebase`; `reset` and `checkout` pass through. Unit-tested on strings because producing every variant from a real repository would be a fixture per git subcommand. |
| `a_message_with_no_colon_still_has_a_word_for_what_happened` | `crates/spagitty-core/src/reflog.rs` | Odd text survives whole; empty text becomes `moved` rather than a blank column. |
| `the_first_entry_of_a_ref_says_it_was_created` | `crates/spagitty-core/src/reflog.rs` | `created` is true and the short id is **empty** — `0000000` reads as a real commit at a glance, and the screen needs to be able to write a word there instead. |
| `a_branch_has_its_own_log_separate_from_head` | `crates/spagitty-core/src/reflog.rs` | The branch's log is named for the branch, and HEAD's has at least as much in it, because HEAD records checkouts too. |
| `an_empty_reference_means_head` | `crates/spagitty-core/src/reflog.rs` | The default the screen relies on. |
| `a_limit_cuts_the_list_and_says_it_did` | `crates/spagitty-core/src/reflog.rs` | One entry and `truncated`. Silently cutting would make an old entry look absent. |
| `a_reference_that_does_not_exist_is_an_error_naming_it` | `crates/spagitty-core/src/reflog.rs` | The ref name is in the message. |
| `the_refs_worth_offering_start_with_head_and_then_the_branches` | `crates/spagitty-core/src/reflog.rs` | HEAD first, local branches after, and no remote-tracking refs — their logs record fetches, not anything the user did. |
| `takes the entries and the refs together` | `src/lib/reflog/store.test.ts` | One load fills both. |
| `asks about HEAD until told otherwise` | `src/lib/reflog/store.test.ts` | The empty reference, which is the log that answers "what did I just do". |
| `switches to a branch’s own log` | `src/lib/reflog/store.test.ts` | The full ref name reaches the API. |
| `reports nothing rather than failing with no repository open` | `src/lib/reflog/store.test.ts` | A state, not an error. |
| `surfaces a read that failed` | `src/lib/reflog/store.test.ts` | git's message reaches the screen. |
| `tells "keeps no reflog" apart from "has not moved"` | `src/lib/reflog/store.test.ts` | Both directions of `absent`. Collapsing them would tell somebody to wait for entries that are never coming. |
| `matches the operation` / `matches the message as well, and ignores case` | `src/lib/reflog/store.test.ts` | Both fields, and the hidden count that goes with them. |
| `shows everything again when it is cleared` | `src/lib/reflog/store.test.ts` | Whitespace is not a filter. |
| `creates a branch at the entry without checking it out` | `src/lib/reflog/store.test.ts` | `checkout: false` — the recovery that cannot cost anything stays that way. |
| `trims the name and refuses an empty one` | `src/lib/reflog/store.test.ts` | Whitespace does not become part of a ref name. |
| `checks out an entry detached` | `src/lib/reflog/store.test.ts` | The id, detached. |
| `resets hard, never any softer` | `src/lib/reflog/store.test.ts` | A softer reset would leave the working tree describing a commit that is no longer checked out. |
| `re-reads afterwards, because recovering is itself a move` | `src/lib/reflog/store.test.ts` | The list after a recovery is not the list before it plus nothing. |
| `surfaces a refusal rather than pretending it worked` | `src/lib/reflog/store.test.ts` | A name collision reaches `writeError`. |
| `suggests a name nobody has to invent` | `src/lib/reflog/actions.test.ts` | `recovered/<short>`. |
| `promises that nothing existing is moved` | `src/lib/reflog/actions.test.ts` | The branch-here wording, and the store called zero times until the prompt is answered. |
| `says the head will be detached, and how to get back` | `src/lib/reflog/actions.test.ts` | Both halves, and **not** painted as destructive. |
| `says the commits it moves past are still recoverable here` | `src/lib/reflog/actions.test.ts` | The reassuring half of the reset wording. |
| `says uncommitted work is the thing that is not` | `src/lib/reflog/actions.test.ts` | The important half: everything else on this screen is recoverable from this screen, and the working tree never was. |
| `asks first, and is the only one painted as destructive` | `src/lib/reflog/actions.test.ts` | The gate, and the ordering argument made visible. |
| `does nothing when dismissed` | `src/lib/reflog/actions.test.ts` | Asserted on branch-here and reset-here both. |
| `runs the screens in the order they are worked through` | `src/lib/nav.test.ts` | Extended rather than rewritten: Reflog after Log, before the divider. |

## What is not covered

- **The route.** `src/routes/reflog/+page.svelte` is read rather than mounted,
  as everywhere else in this suite. The three empty states and the ref chips are
  SWEEP-050-02, -06 and -07.
- **Numbering against `git reflog` itself.** The core's numbering is asserted
  against its own reading of the file; whether it agrees with the git binary on
  a repository with a long, messy reflog is SWEEP-050-01, and it is a P1.
- **A reflog with entries older than the 500 cap.** `truncated` is asserted with
  a limit of 1; a real 500-entry repository is not built here.
