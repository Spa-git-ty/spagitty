// SPDX-License-Identifier: GPL-3.0-or-later

//! Tags, gathered in one place (FEAT-051).
//!
//! Creating and deleting a tag has been possible since FEAT-022, through the
//! graph's context menu — which means you could only do either while looking at
//! the commit it was about. That is the wrong way round for the question people
//! actually have, which is "what versions are there", and it left annotated tags
//! with their messages nowhere to be read at all.
//!
//! # Two kinds of tag, and the difference is not cosmetic
//!
//! A **lightweight** tag is a ref pointing straight at a commit. An
//! **annotated** tag is an object of its own — with a tagger, a date and a
//! message — that in turn points at the commit. Only the second can carry a
//! message, only the second records who made it, and the two are told apart
//! here rather than flattened, because "v1.0.0 has no message" and "v1.0.0
//! cannot have a message" are different answers.
//!
//! Everything here reads with `gix` and writes through [`crate::shell`], the
//! same split as everywhere else.

use serde::Serialize;

use crate::error::{Error, Result};
use crate::graph::short_id;

/// One tag, peeled to the commit it names.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Tag {
    /// Short name — `v1.0.0`, not `refs/tags/v1.0.0`.
    pub name: String,
    /// The commit it points at, after peeling an annotated tag.
    pub target: String,
    pub target_short: String,
    /// True when this is a tag object rather than a ref pointing at a commit.
    pub annotated: bool,
    /// The tag's own message. Empty for a lightweight tag, which has none.
    pub message: String,
    /// Who made the tag, for an annotated one. Empty otherwise.
    pub tagger_name: String,
    /// When it was made, for an annotated one; otherwise the commit's own time,
    /// so that a mixed list still sorts by something meaningful.
    pub time: i64,
    /// First line of the tagged commit's message, so a row says what it names.
    pub summary: String,
}

/// Every tag, newest first.
///
/// Newest first rather than alphabetical: `v10.0.0` sorts before `v2.0.0` in
/// any string order, and a version-aware sort would have to guess at a scheme
/// this project does not get to choose. Time is the one ordering that is right
/// without guessing.
pub fn tags(repo: &gix::Repository) -> Result<Vec<Tag>> {
    let platform = repo
        .references()
        .map_err(|error| Error::Refs(error.to_string()))?;
    let iter = platform
        .prefixed("refs/tags/")
        .map_err(|error| Error::Refs(error.to_string()))?;

    let mut tags: Vec<Tag> = Vec::new();

    for reference in iter.flatten() {
        let name = reference.name().shorten().to_string();
        let Some(tag) = read(repo, reference, name) else {
            continue;
        };
        tags.push(tag);
    }

    tags.sort_by(|a, b| b.time.cmp(&a.time).then_with(|| a.name.cmp(&b.name)));
    Ok(tags)
}

/// Read one tag ref, or `None` for one that no longer resolves.
///
/// A ref pointing at a missing object is skipped rather than failing the whole
/// list: one broken tag in a repository is not a reason to show none of them.
fn read(repo: &gix::Repository, reference: gix::Reference<'_>, name: String) -> Option<Tag> {
    let id = reference.clone().into_fully_peeled_id().ok()?;
    let commit = repo.find_object(id).ok()?.try_into_commit().ok()?;
    let summary = commit
        .message()
        .ok()
        .map(|message| message.summary().to_string())
        .unwrap_or_default();
    let committed = commit.time().map(|time| time.seconds).unwrap_or(0);

    // An annotated tag's ref points at a tag object; peeling it reaches the
    // commit. Reading the ref's own target back tells the two apart.
    let annotated = reference
        .clone()
        .try_id()
        .and_then(|direct| repo.find_object(direct).ok())
        .map(|object| object.kind == gix::object::Kind::Tag)
        .unwrap_or(false);

    let (message, tagger_name, time) = if annotated {
        reference
            .try_id()
            .and_then(|direct| repo.find_object(direct).ok())
            .and_then(|object| object.try_into_tag().ok())
            .map(|tag| {
                let decoded = tag.decode().ok();
                let message = decoded
                    .as_ref()
                    .map(|tag| tag.message.to_string().trim().to_string())
                    .unwrap_or_default();
                let tagger = decoded.as_ref().and_then(|tag| tag.tagger().ok().flatten());
                let name = tagger
                    .as_ref()
                    .map(|tagger| tagger.name.to_string())
                    .unwrap_or_default();
                let seconds = tagger
                    .as_ref()
                    .and_then(|tagger| tagger.time().ok())
                    .map(|time| time.seconds)
                    .unwrap_or(committed);
                (message, name, seconds)
            })
            .unwrap_or_else(|| (String::new(), String::new(), committed))
    } else {
        (String::new(), String::new(), committed)
    };

    Some(Tag {
        name,
        target_short: short_id(&id.detach()),
        target: id.detach().to_string(),
        annotated,
        message,
        tagger_name,
        time,
        summary,
    })
}

/// Create a tag. A non-empty message makes it annotated.
///
/// An empty `target` means `HEAD`, which is what `git tag` itself does.
pub fn create(repo: &gix::Repository, name: &str, target: &str, message: &str) -> Result<()> {
    let name = name.trim();
    if name.is_empty() {
        return Err(Error::NotStageable("a tag needs a name".into()));
    }
    crate::shell::create_tag(crate::repo::workdir(repo)?, name, target.trim(), message.trim())
}

/// Delete a local tag.
pub fn delete(repo: &gix::Repository, name: &str) -> Result<()> {
    crate::shell::delete_tag(crate::repo::workdir(repo)?, name)
}

/// Rewrite an annotated tag's message, keeping it on the same commit.
///
/// git has no "edit a tag message" — a tag object is immutable, so this deletes
/// and recreates it at the same target. That is what `git tag -a -f` does too,
/// and it is worth knowing rather than hiding: the tag's date and tagger become
/// today's, and a tag already pushed will need forcing to update the remote.
pub fn retag(repo: &gix::Repository, name: &str, target: &str, message: &str) -> Result<()> {
    let message = message.trim();
    if message.is_empty() {
        return Err(Error::NotStageable(
            "an annotated tag needs a message; delete it instead".into(),
        ));
    }

    let workdir = crate::repo::workdir(repo)?;
    crate::shell::delete_tag(workdir, name)?;
    crate::shell::create_tag(workdir, name, target, message)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fixture::Fixture;

    fn find<'a>(tags: &'a [Tag], name: &str) -> &'a Tag {
        tags.iter()
            .find(|tag| tag.name == name)
            .unwrap_or_else(|| panic!("no tag {name}"))
    }

    #[test]
    fn a_repository_with_no_tags_reports_none() {
        let fixture = Fixture::empty();
        fixture.write("a.txt", "a\n");
        fixture.git(&["add", "-A"]);
        fixture.commit("First");

        assert!(tags(&fixture.open()).expect("tags").is_empty());
    }

    #[test]
    fn the_woven_fixtures_annotated_tag_is_found_with_its_message() {
        let found = tags(&Fixture::woven().open()).expect("tags");
        let tag = find(&found, "v0.1.0");

        assert!(tag.annotated);
        assert_eq!(tag.message, "First tag");
        assert!(!tag.tagger_name.is_empty());
    }

    #[test]
    fn a_lightweight_tag_is_told_apart_from_an_annotated_one() {
        // "has no message" and "cannot have a message" are different answers.
        // The woven fixture has one of each: `v0.1.0 -a` and a plain `v0.2.0`.
        let found = tags(&Fixture::woven().open()).expect("tags");

        assert!(!find(&found, "v0.2.0").annotated);
        assert_eq!(find(&found, "v0.2.0").message, "");
        assert!(find(&found, "v0.1.0").annotated);
    }

    #[test]
    fn an_annotated_tag_is_peeled_to_the_commit_it_names() {
        // Unpeeled, the target would be the tag object, and every screen that
        // looked a commit up by it would find nothing.
        let fixture = Fixture::woven();
        let found = tags(&fixture.open()).expect("tags");
        let tag = find(&found, "v0.1.0");

        let kind = fixture.git(&["cat-file", "-t", &tag.target]);
        assert_eq!(kind.trim(), "commit");
        assert_eq!(tag.target_short, tag.target[..7]);
    }

    #[test]
    fn each_tag_says_what_its_commit_was_about() {
        let found = tags(&Fixture::woven().open()).expect("tags");

        assert!(!find(&found, "v0.1.0").summary.is_empty());
    }

    #[test]
    fn tags_come_back_newest_first() {
        // Not alphabetical: `v10.0.0` sorts before `v2.0.0` in any string
        // order, and a version-aware sort would guess at a scheme this project
        // does not choose.
        //
        // Asserted as a property rather than as a fixed order. A fixture's
        // commits and tags are all made within the same second, so any test
        // that named the first row would be testing the tie-break — and the
        // tie-break is alphabetical, which is the thing this ordering is
        // deliberately *not* about.
        let fixture = Fixture::woven();
        fixture.git(&["tag", "-a", "v0.3.0", "-m", "Third tag"]);

        let found = tags(&fixture.open()).expect("tags");
        assert!(found.len() >= 3);

        for pair in found.windows(2) {
            assert!(
                pair[0].time >= pair[1].time,
                "{} ({}) came before {} ({})",
                pair[0].name,
                pair[0].time,
                pair[1].name,
                pair[1].time
            );
        }
    }

    #[test]
    fn a_lightweight_tag_on_an_old_commit_sorts_by_that_commit() {
        // The consequence of mixing tagger time and commit time in one order,
        // stated rather than discovered: a lightweight tag made today on a
        // commit from last year sorts as last year, because that is the only
        // date it has.
        let fixture = Fixture::woven();
        let old = fixture.git(&["rev-parse", "HEAD~1"]).trim().to_string();
        fixture.git(&["tag", "on-an-old-commit", &old]);

        let found = tags(&fixture.open()).expect("tags");
        let tag = find(&found, "on-an-old-commit");
        let head_tag = find(&found, "v0.2.0");

        assert!(tag.time <= head_tag.time);
    }

    #[test]
    fn creating_a_tag_without_a_message_leaves_it_lightweight() {
        let fixture = Fixture::woven();

        create(&fixture.open(), "plain", "", "").expect("create");

        assert!(!find(&tags(&fixture.open()).expect("tags"), "plain").annotated);
    }

    #[test]
    fn creating_a_tag_with_a_message_annotates_it() {
        let fixture = Fixture::woven();

        create(&fixture.open(), "v9.9.9", "", "Ninth").expect("create");

        let found = tags(&fixture.open()).expect("tags");
        let tag = find(&found, "v9.9.9");
        assert!(tag.annotated);
        assert_eq!(tag.message, "Ninth");
    }

    #[test]
    fn a_tag_can_be_created_somewhere_other_than_head() {
        let fixture = Fixture::woven();
        let elsewhere = fixture.git(&["rev-parse", "HEAD~1"]).trim().to_string();

        create(&fixture.open(), "older", &elsewhere, "").expect("create");

        assert_eq!(find(&tags(&fixture.open()).expect("tags"), "older").target, elsewhere);
    }

    #[test]
    fn a_tag_with_no_name_is_refused_before_git_sees_it() {
        let fixture = Fixture::woven();

        let error = create(&fixture.open(), "   ", "", "").unwrap_err();

        assert!(format!("{error}").contains("needs a name"), "unexpected: {error}");
    }

    #[test]
    fn deleting_a_tag_removes_it() {
        let fixture = Fixture::woven();

        delete(&fixture.open(), "v0.1.0").expect("delete");

        let found = tags(&fixture.open()).expect("tags");
        assert!(!found.iter().any(|tag| tag.name == "v0.1.0"));
        // And only that one: the fixture's other tag is untouched.
        assert!(found.iter().any(|tag| tag.name == "v0.2.0"));
    }

    #[test]
    fn retagging_rewrites_the_message_and_stays_on_the_same_commit() {
        // A tag object is immutable, so this is a delete and a recreate. What
        // must not move is the commit it names.
        let fixture = Fixture::woven();
        let before = find(&tags(&fixture.open()).expect("tags"), "v0.1.0").target.clone();

        retag(&fixture.open(), "v0.1.0", &before, "Corrected message").expect("retag");

        let found = tags(&fixture.open()).expect("tags");
        let tag = find(&found, "v0.1.0");
        assert_eq!(tag.target, before);
        assert_eq!(tag.message, "Corrected message");
        assert!(tag.annotated);
    }

    #[test]
    fn retagging_with_an_empty_message_is_refused_rather_than_deleting_the_tag() {
        // The failure that would otherwise be silent: this operation deletes
        // before it creates, so an empty message would leave no tag at all.
        let fixture = Fixture::woven();

        let error = retag(&fixture.open(), "v0.1.0", "HEAD", "  ").unwrap_err();

        assert!(format!("{error}").contains("needs a message"), "unexpected: {error}");
        assert!(!tags(&fixture.open()).expect("tags").is_empty());
    }
}
