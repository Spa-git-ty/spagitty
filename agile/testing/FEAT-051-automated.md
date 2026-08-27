<!-- SPDX-License-Identifier: GPL-3.0-or-later -->

# FEAT-051 — Automated tests

**Item:** [`agile/items/FEAT-051-tags-list.md`](../items/FEAT-051-tags-list.md)
**Plan:** [`agile/plans/FEAT-051-plan.md`](../plans/FEAT-051-plan.md)

## What was written

| Test | Layer | What it asserts |
| --- | --- | --- |
| `a_repository_with_no_tags_reports_none` | `crates/spagitty-core/src/tags.rs` | An empty list, not an error. |
| `the_woven_fixtures_annotated_tag_is_found_with_its_message` | `crates/spagitty-core/src/tags.rs` | The message and the tagger are read off the tag object. |
| `a_lightweight_tag_is_told_apart_from_an_annotated_one` | `crates/spagitty-core/src/tags.rs` | The fixture has one of each, and they come back different. This is the distinction the whole screen is built on. |
| `an_annotated_tag_is_peeled_to_the_commit_it_names` | `crates/spagitty-core/src/tags.rs` | `cat-file -t` on the target says `commit`. Unpeeled, every screen looking a commit up by it would find nothing. |
| `each_tag_says_what_its_commit_was_about` | `crates/spagitty-core/src/tags.rs` | The summary is filled in, so a row says what it names. |
| `tags_come_back_newest_first` | `crates/spagitty-core/src/tags.rs` | Asserted as a **property** — every row's time is at least the next one's — rather than as a fixed order. A fixture's commits and tags are made within the same second, so naming the first row would be testing the alphabetical tie-break, which is the thing this ordering is deliberately not about. |
| `a_lightweight_tag_on_an_old_commit_sorts_by_that_commit` | `crates/spagitty-core/src/tags.rs` | The documented consequence of mixing tagger time and commit time, stated rather than discovered. |
| `creating_a_tag_without_a_message_leaves_it_lightweight` | `crates/spagitty-core/src/tags.rs` | Empty message, no `--annotate`. |
| `creating_a_tag_with_a_message_annotates_it` | `crates/spagitty-core/src/tags.rs` | And the message survives the round trip. |
| `a_tag_can_be_created_somewhere_other_than_head` | `crates/spagitty-core/src/tags.rs` | The target reaches git and the tag lands on it. |
| `a_tag_with_no_name_is_refused_before_git_sees_it` | `crates/spagitty-core/src/tags.rs` | A whitespace name is an error naming the problem. |
| `deleting_a_tag_removes_it` | `crates/spagitty-core/src/tags.rs` | That one, **and only that one** — the fixture's other tag is still there. |
| `retagging_rewrites_the_message_and_stays_on_the_same_commit` | `crates/spagitty-core/src/tags.rs` | The target is unchanged after a delete-and-recreate. The thing that must not move. |
| `retagging_with_an_empty_message_is_refused_rather_than_deleting_the_tag` | `crates/spagitty-core/src/tags.rs` | The failure that would otherwise be silent: this operation deletes before it creates, so an empty message would leave nothing. Asserted by the tag still existing. |
| `takes the list the repository reported` | `src/lib/tags/store.test.ts` | The read reaches the store in order. |
| `reports nothing rather than failing with no repository open` | `src/lib/tags/store.test.ts` | A state, not an error. |
| `surfaces a read that failed` | `src/lib/tags/store.test.ts` | git's message reaches the screen. |
| `matches the name` / `matches the message and the summary too, ignoring case` / `shows everything again when cleared` | `src/lib/tags/store.test.ts` | All three filterable fields, and that whitespace is not a filter. |
| `needs a name` / `refuses a name that already exists` | `src/lib/tags/store.test.ts` | The form is dead rather than the click being wasted. |
| `sends an empty target and message as they are` | `src/lib/tags/store.test.ts` | Empty target means HEAD and empty message means lightweight — `git tag`'s own defaults, not something invented here. |
| `trims all three and clears the form afterwards` | `src/lib/tags/store.test.ts` | Whitespace does not become part of a tag name. |
| `keeps the form when the create failed` | `src/lib/tags/store.test.ts` | A failed create does not also lose what was typed. |
| `deletes by name and re-reads` | `src/lib/tags/store.test.ts` | The call, the reload, and the repository refresh. |
| `rewrites a message at the same commit` | `src/lib/tags/store.test.ts` | The target is passed through so the recreate lands where the original was. |
| `refuses an empty rewrite, which would leave no tag at all` | `src/lib/tags/store.test.ts` | The store's half of the two guards. |
| `checks a tag out by name, detached` | `src/lib/tags/store.test.ts` | By name, which is what the user recognises. |
| `surfaces a refusal rather than pretending it worked` | `src/lib/tags/store.test.ts` | git's own words reach `writeError`. |
| `says the commit is untouched` / `warns that a fetch can bring it back` | `src/lib/tags/actions.test.ts` | Both halves of the delete wording. The second is why a reappearing tag does not look like a failed delete. |
| `asks first, and is painted as destructive` / `does nothing when dismissed` | `src/lib/tags/actions.test.ts` | The gate on delete. |
| `is offered only for an annotated tag` | `src/lib/tags/actions.test.ts` | No dialog and no call for a lightweight one — turning one into the other is not what "edit message" means. |
| `says it is a delete and a recreate, and what that moves` | `src/lib/tags/actions.test.ts` | The immutability, the date and tagger moving, and the danger flag. |
| `does nothing when the message comes back unchanged or empty` | `src/lib/tags/actions.test.ts` | Neither reaches the store. |
| `says the head will be detached, and how to get back` | `src/lib/tags/actions.test.ts` | Both halves, and **not** destructive. |
| `runs the screens in the order they are worked through` | `src/lib/nav.test.ts` | Extended: Tags beside Branches. |

## What is not covered

- **The route.** `src/routes/tags/+page.svelte` is read rather than mounted, as
  everywhere else in this suite. The annotated/lightweight marking, the dashed
  row and the disabled edit-message label are SWEEP-051-02 and -05.
- **A tag on a non-commit object** — git allows tagging a tree or a blob. The
  reader skips what it cannot peel to a commit rather than failing the list, and
  that path has no fixture.
- **A signed tag.** Read as an ordinary annotated tag; the signature is in the
  message and is neither parsed nor verified.
