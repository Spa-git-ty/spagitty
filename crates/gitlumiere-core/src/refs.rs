// SPDX-License-Identifier: GPL-3.0-or-later

//! Refs, and the per-commit chips the graph's refs gutter draws.
//!
//! The index is built once per refresh and handed to the walk, so attaching
//! chips to a row is a hash lookup rather than a ref scan per commit.

use std::collections::HashMap;

use gix::ObjectId;
use serde::Serialize;

use crate::error::{Error, Result};

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum RefKind {
    Branch,
    Remote,
    Tag,
}

/// One ref chip. `name` is already shortened for display: `master`,
/// `origin/master`, `v12.0.0-nightly`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RefChip {
    pub name: String,
    pub kind: RefKind,
    /// True for the branch HEAD points at. Drawn with an accent border and a check.
    pub current: bool,
}

/// Commit id -> the refs pointing at it.
#[derive(Debug, Default)]
pub struct RefIndex {
    by_commit: HashMap<ObjectId, Vec<RefChip>>,
    /// Short name of the current branch, or None when HEAD is detached.
    current_branch: Option<String>,
    counts: RefCounts,
}

#[derive(Debug, Default, Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RefCounts {
    pub branches: usize,
    pub remotes: usize,
    pub tags: usize,
}

impl RefIndex {
    /// Scan every ref and group it by the commit it resolves to.
    ///
    /// Tags are fully peeled, so an annotated tag lands on its commit rather
    /// than on the tag object — otherwise tag chips would never appear in the
    /// gutter, since the walk only ever yields commits.
    pub fn build(repo: &gix::Repository) -> Result<Self> {
        let mut index = RefIndex {
            current_branch: current_branch(repo),
            ..Default::default()
        };

        let platform = repo.references().map_err(|e| Error::Refs(e.to_string()))?;
        let iter = platform.all().map_err(|e| Error::Refs(e.to_string()))?;

        for reference in iter.filter_map(std::result::Result::ok) {
            let full = reference.name().as_bstr().to_string();

            let (kind, name) = if let Some(rest) = full.strip_prefix("refs/heads/") {
                (RefKind::Branch, rest.to_string())
            } else if let Some(rest) = full.strip_prefix("refs/remotes/") {
                // `origin/HEAD` is a symbolic pointer, not a branch anyone wants
                // to see as a chip.
                if rest.ends_with("/HEAD") {
                    continue;
                }
                (RefKind::Remote, rest.to_string())
            } else if let Some(rest) = full.strip_prefix("refs/tags/") {
                (RefKind::Tag, rest.to_string())
            } else {
                // refs/stash, refs/notes, and anything else a tool has left
                // behind. Not history the gutter should label.
                continue;
            };

            let mut reference = reference;
            let Ok(id) = reference.peel_to_id() else {
                // A ref pointing at a missing object. Broken, but not a reason
                // to fail the whole graph.
                continue;
            };
            let id = id.detach();

            match kind {
                RefKind::Branch => index.counts.branches += 1,
                RefKind::Remote => index.counts.remotes += 1,
                RefKind::Tag => index.counts.tags += 1,
            }

            let current =
                kind == RefKind::Branch && index.current_branch.as_deref() == Some(name.as_str());

            index.by_commit.entry(id).or_default().push(RefChip {
                name,
                kind,
                current,
            });
        }

        // Order within a commit: the current branch first, then local branches,
        // then remotes, then tags. The gutter is right-aligned and collapses
        // overflow, so the most important chip has to be the one that survives.
        for chips in index.by_commit.values_mut() {
            chips.sort_by(|a, b| {
                b.current
                    .cmp(&a.current)
                    .then(a.kind.cmp(&b.kind))
                    .then(a.name.cmp(&b.name))
            });
        }

        Ok(index)
    }

    /// Chips for a commit. Empty for the vast majority of rows.
    pub fn chips_for(&self, id: &ObjectId) -> Vec<RefChip> {
        self.by_commit.get(id).cloned().unwrap_or_default()
    }

    pub fn current_branch(&self) -> Option<&str> {
        self.current_branch.as_deref()
    }

    pub fn counts(&self) -> RefCounts {
        self.counts
    }
}

/// Short name of the branch HEAD points at, or None when detached.
fn current_branch(repo: &gix::Repository) -> Option<String> {
    let head = repo.head().ok()?;
    let name = head.referent_name()?;
    Some(name.shorten().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fixture::Fixture;

    fn names(chips: &[RefChip]) -> Vec<&str> {
        chips.iter().map(|c| c.name.as_str()).collect()
    }

    #[test]
    fn every_kind_of_ref_is_counted_once() {
        let fixture = Fixture::woven();
        let index = RefIndex::build(&fixture.open()).expect("index");
        let counts = index.counts();

        // main, feature/split-view, merged/already-in-main
        assert_eq!(counts.branches, 3);
        assert_eq!(counts.tags, 2, "one annotated and one lightweight");
        assert_eq!(counts.remotes, 0, "the fixture has no remote");
    }

    #[test]
    fn the_current_branch_is_known_and_marked() {
        let fixture = Fixture::woven();
        let index = RefIndex::build(&fixture.open()).expect("index");

        assert_eq!(index.current_branch(), Some("main"));

        let id = gix::ObjectId::from_hex(fixture.head().as_bytes()).expect("head id");
        let chips = index.chips_for(&id);
        let main = chips.iter().find(|c| c.name == "main").expect("main chip");
        assert!(main.current);
    }

    #[test]
    fn a_detached_head_has_no_current_branch() {
        let fixture = Fixture::woven();
        fixture.git(&["checkout", "-q", "--detach", "HEAD~1"]);

        let index = RefIndex::build(&fixture.open()).expect("index");

        assert_eq!(index.current_branch(), None);
    }

    #[test]
    fn an_annotated_tag_lands_on_its_commit_rather_than_on_the_tag_object() {
        // Without peeling, a tag chip would never appear: the walk only ever
        // yields commits, and an annotated tag points at a tag object.
        let fixture = Fixture::woven();
        let index = RefIndex::build(&fixture.open()).expect("index");

        let tagged = fixture.rev("v0.1.0^{commit}");
        let id = gix::ObjectId::from_hex(tagged.as_bytes()).expect("tagged id");

        assert!(names(&index.chips_for(&id)).contains(&"v0.1.0"));
    }

    #[test]
    fn a_lightweight_tag_lands_on_its_commit_too() {
        let fixture = Fixture::woven();
        let index = RefIndex::build(&fixture.open()).expect("index");

        let id = gix::ObjectId::from_hex(fixture.rev("v0.2.0").as_bytes()).expect("id");
        assert!(names(&index.chips_for(&id)).contains(&"v0.2.0"));
    }

    #[test]
    fn names_are_shortened_for_display() {
        let fixture = Fixture::woven();
        let index = RefIndex::build(&fixture.open()).expect("index");

        let id = gix::ObjectId::from_hex(fixture.rev("feature/split-view").as_bytes()).expect("id");
        let chips = index.chips_for(&id);

        assert!(names(&chips).contains(&"feature/split-view"));
        assert!(
            chips.iter().all(|c| !c.name.starts_with("refs/")),
            "a chip should never show its full ref path: {:?}",
            names(&chips)
        );
    }

    #[test]
    fn the_current_branch_sorts_ahead_of_everything_else_on_its_commit() {
        // The gutter is right-aligned and collapses overflow, so the chip that
        // survives has to be the most important one.
        let fixture = Fixture::woven();
        fixture.git(&["branch", "aaa-sorts-first", "main"]);

        let index = RefIndex::build(&fixture.open()).expect("index");
        let id = gix::ObjectId::from_hex(fixture.head().as_bytes()).expect("id");
        let chips = index.chips_for(&id);

        assert_eq!(chips[0].name, "main");
        assert!(chips[0].current);
    }

    #[test]
    fn branches_sort_ahead_of_tags_on_the_same_commit() {
        let fixture = Fixture::woven();
        let index = RefIndex::build(&fixture.open()).expect("index");
        let id = gix::ObjectId::from_hex(fixture.head().as_bytes()).expect("id");

        let kinds: Vec<RefKind> = index.chips_for(&id).iter().map(|c| c.kind).collect();
        let first_tag = kinds.iter().position(|k| *k == RefKind::Tag);
        let last_branch = kinds.iter().rposition(|k| *k == RefKind::Branch);

        if let (Some(tag), Some(branch)) = (first_tag, last_branch) {
            assert!(branch < tag, "branches must come before tags: {kinds:?}");
        }
    }

    #[test]
    fn a_remote_tracking_branch_is_a_remote_chip_and_origin_head_is_not_a_chip() {
        let fixture = Fixture::woven();
        let head = fixture.head();
        // A remote-tracking ref and the symbolic pointer git writes beside it.
        fixture.git(&["update-ref", "refs/remotes/origin/main", &head]);
        fixture.git(&[
            "symbolic-ref",
            "refs/remotes/origin/HEAD",
            "refs/remotes/origin/main",
        ]);

        let index = RefIndex::build(&fixture.open()).expect("index");
        let id = gix::ObjectId::from_hex(head.as_bytes()).expect("id");
        let chips = index.chips_for(&id);

        assert!(names(&chips).contains(&"origin/main"));
        assert!(
            !names(&chips).iter().any(|n| n.ends_with("/HEAD")),
            "origin/HEAD is a pointer, not a branch anyone wants as a chip"
        );
        assert_eq!(index.counts().remotes, 1);
    }

    #[test]
    fn refs_that_are_not_history_labels_are_ignored() {
        // refs/stash exists in the fixture, and notes are written here.
        let fixture = Fixture::woven();
        fixture.git(&["notes", "add", "-m", "a note", "HEAD"]);

        let index = RefIndex::build(&fixture.open()).expect("index");
        let counts = index.counts();

        assert_eq!(counts.branches + counts.remotes + counts.tags, 5);
    }

    #[test]
    fn a_commit_with_no_refs_has_no_chips() {
        let fixture = Fixture::woven();
        let index = RefIndex::build(&fixture.open()).expect("index");
        // "Rewrite line 3": inside the merged branch, but not its tip.
        let id = gix::ObjectId::from_hex(fixture.rev("HEAD^2~1").as_bytes()).expect("id");

        assert!(index.chips_for(&id).is_empty());
    }

    #[test]
    fn an_empty_repository_has_no_refs_and_is_not_an_error() {
        let fixture = Fixture::empty();
        let index = RefIndex::build(&fixture.open()).expect("index");

        assert_eq!(index.counts().branches, 0);
        assert_eq!(
            index.current_branch(),
            Some("main"),
            "the unborn branch is still named"
        );
    }
}
