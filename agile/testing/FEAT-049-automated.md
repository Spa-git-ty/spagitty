<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-049 — Automated tests

**Item:** [`agile/items/FEAT-049-remotes-management.md`](../items/FEAT-049-remotes-management.md)
**Plan:** [`agile/plans/FEAT-049-plan.md`](../plans/FEAT-049-plan.md)

## What was written

| Test | Layer | What it asserts |
| --- | --- | --- |
| `a_repository_with_no_remotes_reports_none` | `crates/spagitty-core/src/remotes.rs` | An empty list, not an error. |
| `every_configured_remote_is_listed_with_its_url` | `crates/spagitty-core/src/remotes.rs` | Both remotes, with the URL config holds. |
| `they_come_back_in_name_order_rather_than_config_order` | `crates/spagitty-core/src/remotes.rs` | `backup` was added second and sorts first. A list that reorders itself as the config file is edited is one nobody can scan. |
| `the_host_is_read_from_the_url` | `crates/spagitty-core/src/remotes.rs` | GitHub and GitLab from an HTTPS and an SSH URL — the same `Host` the graph's chips use. |
| `a_remote_that_has_never_been_fetched_has_no_refs` | `crates/spagitty-core/src/remotes.rs` | Zero, which is what the section turns into "never fetched". |
| `refs_are_counted_per_remote` | `crates/spagitty-core/src/remotes.rs` | Two refs land on `origin` and none on `backup` — the counting is per remote, not a total. |
| `a_push_url_is_reported_only_when_it_is_configured` | `crates/spagitty-core/src/remotes.rs` | `None` for the ordinary case rather than the fetch URL copied in. |
| `adding_a_remote_configures_it_and_fetches_nothing` | `crates/spagitty-core/src/remotes.rs` | The URL is set, no refs appear, **and the fetch refspec exists**. The last one is why this goes through `git`. |
| `renaming_a_remote_moves_its_refs_with_it` | `crates/spagitty-core/src/remotes.rs` | `refs/remotes/upstream/main` exists afterwards. A config-only rename would leave the old refs behind. |
| `removing_a_remote_takes_its_tracking_refs_with_it` | `crates/spagitty-core/src/remotes.rs` | The remote is gone and `for-each-ref refs/remotes/origin` is empty. |
| `a_url_can_be_changed_without_touching_anything_else` | `crates/spagitty-core/src/remotes.rs` | The URL moves and the name does not. |
| `takes the list the repository reported` | `src/lib/remotes/store.test.ts` | The read reaches the store. |
| `reports an empty list rather than an error with no repository open` | `src/lib/remotes/store.test.ts` | Having no repository is a state, not a failure. |
| `surfaces a read that failed` | `src/lib/remotes/store.test.ts` | git's message, and an empty list rather than a stale one. |
| `needs both a name and a URL` | `src/lib/remotes/store.test.ts` | `addable` goes true only when both are there. |
| `refuses a name that is already taken` | `src/lib/remotes/store.test.ts` | Caught before git, whose refusal names a config key instead of the remote. |
| `refuses a name with a slash or a space in it` | `src/lib/remotes/store.test.ts` | Both, for the same reason. |
| `trims what was typed and clears the form afterwards` | `src/lib/remotes/store.test.ts` | Whitespace does not become part of a remote name, and a successful add empties the form. |
| `keeps the form when the add failed` | `src/lib/remotes/store.test.ts` | A failed add does not also lose what was typed. |
| `re-reads the list after every write` | `src/lib/remotes/store.test.ts` | Renaming moves refs and rewrites upstreams; the list is re-read rather than patched. |
| `refuses a rename to nothing or to the same name` | `src/lib/remotes/store.test.ts` | Neither reaches git. |
| `trims a typed name and URL` | `src/lib/remotes/store.test.ts` | Both write paths trim. |
| `refuses an empty URL` | `src/lib/remotes/store.test.ts` | A blank URL is not a remote that points nowhere; it is a mistake. |
| `removes without asking — the confirmation belongs to the caller` | `src/lib/remotes/store.test.ts` | Where the question lives, pinned. |
| `surfaces a refusal rather than pretending it worked` | `src/lib/remotes/store.test.ts` | git's own words reach `writeError`. |
| `says nothing local is lost when it was never fetched` | `src/lib/remotes/actions.test.ts` | The zero-ref wording. |
| `counts the refs, and says a fetch brings them back` | `src/lib/remotes/actions.test.ts` | Both halves: what is lost, and that it is recoverable in one command. |
| `has the singular for one ref` | `src/lib/remotes/actions.test.ts` | "1 remote-tracking ref is". |
| `always warns that branches stop tracking anything` | `src/lib/remotes/actions.test.ts` | Every shape of the body carries it. |
| `asks first, and is painted as destructive` | `src/lib/remotes/actions.test.ts` | Dialog open, store called zero times. |
| `does nothing when dismissed` | `src/lib/remotes/actions.test.ts` | Dismissal reaches nothing. |
| `warns that every branch tracking it is repointed` | `src/lib/remotes/actions.test.ts` | The rename sentence — the one that sounds milder than it is. |
| `does nothing when the name comes back unchanged or empty` | `src/lib/remotes/actions.test.ts` | Accepting a prompt without editing is not a rename. |
| `says the refs already fetched stay where they are` | `src/lib/remotes/actions.test.ts` | The change-URL sentence. |
| `does nothing when the URL comes back unchanged` | `src/lib/remotes/actions.test.ts` | The same guard on the other prompt. |
| `says remotes belong to a repository when none is open` | `src/lib/settings/remotes-section.test.ts` | The message, **and no form** — there is nothing for an added remote to belong to. |
| `says a repository has none, and still offers the form` | `src/lib/settings/remotes-section.test.ts` | The other empty state and the opposite response: this one is fixable right here. |
| `shows each remote with its URL and its forge` | `src/lib/settings/remotes-section.test.ts` | One row per remote, with the forge label. |
| `says a remote has never been fetched rather than showing a zero` | `src/lib/settings/remotes-section.test.ts` | The words, and the absence of "0 refs". |
| `counts refs when there are some` | `src/lib/settings/remotes-section.test.ts` | Singular and plural. |
| `shows a push URL only when one is configured` | `src/lib/settings/remotes-section.test.ts` | One line, on the one remote that has one. |
| `offers rename, change URL and remove on each one` | `src/lib/settings/remotes-section.test.ts` | The three controls in order, with only the destructive one painted as such. |

## What is not covered

- **`--set-upstream` reaching git.** The flag is in `shell::push` and asserted
  by reading the code, not by a test: the existing push tests cannot run without
  a remote to push to, and a fixture with a real remote is a bare repository on
  disk that this suite does not build. SWEEP-049-06 is the check that matters,
  and it is a P1.
- **Credential prompts** on a remote that needs authentication. Nothing here
  touches credentials; FEAT-017 owns them.
- **A URL that is not a valid git URL.** Neither the form nor the core
  validates one: git accepts a remarkable range of them, and refusing what git
  would accept is worse than letting a fetch fail with git's own message.
