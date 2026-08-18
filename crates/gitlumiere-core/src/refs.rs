// SPDX-License-Identifier: GPL-3.0-or-later

//! Refs, and the per-commit chips the graph's refs gutter draws.
//!
//! The index is built once per refresh and handed to the walk, so attaching
//! chips to a row is a hash lookup rather than a ref scan per commit.
//!
//! # One chip per branch (FEAT-036)
//!
//! `refs/heads/main` and `refs/remotes/origin/main` are one branch that happens
//! to exist in two places, so they are one chip carrying two marks rather than
//! two chips repeating the same name. The word `origin` never reaches the
//! screen: where a branch lives is shown as a glyph on the chip, which is both
//! shorter and answers the question people actually have.
//!
//! **The merge is per commit, and that is the whole trick.** Chips are already
//! grouped by the commit they point at, so a local branch and its remote only
//! merge when they are at the same commit — which is exactly when they are the
//! same thing. A remote that has fallen behind is at a different commit, lands
//! on a different row, and correctly appears on its own carrying only its host
//! glyph. Divergence needs no special case; it falls out of the grouping.

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

/// Which forge a remote points at, decided from its URL.
///
/// Only ever used to pick a glyph. Nothing is fetched, nothing is contacted, and
/// an unrecognised host is a generic mark rather than a guess.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Host {
    GitHub,
    GitLab,
    Bitbucket,
    AzureDevOps,
    Generic,
}

impl Host {
    /// Read the host out of a remote URL, in whichever form git accepts it —
    /// `https://…`, `git@host:path`, or `ssh://git@host/path`.
    pub fn from_url(url: &str) -> Self {
        let lower = url.to_ascii_lowercase();

        // The host must come from the *authority*, never from anywhere in the
        // string: `https://git.example.com/mirrors/github.com/o/r.git` is not
        // GitHub, and a substring search says it is.
        let after_scheme = lower
            .split_once("://")
            .map_or(lower.as_str(), |(_, rest)| rest);
        // Authority ends at the first `/` — which also handles a bare path,
        // where there is no authority at all.
        let authority = after_scheme.split('/').next().unwrap_or("");
        // Drop any `user@`, then the `:port` or the scp-like `:path`.
        let authority = authority
            .rsplit_once('@')
            .map_or(authority, |(_, host)| host);
        let authority = authority
            .split_once(':')
            .map_or(authority, |(host, _)| host);

        if authority.contains("github.") {
            Host::GitHub
        } else if authority.contains("gitlab.") {
            Host::GitLab
        } else if authority.contains("bitbucket.") {
            Host::Bitbucket
        } else if authority.contains("dev.azure.com") || authority.contains("visualstudio.com") {
            Host::AzureDevOps
        } else {
            Host::Generic
        }
    }
}

/// A remote carrying a branch, and what to draw for it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteMark {
    /// `origin`, `upstream`. Not shown on the chip; carried for the tooltip.
    pub name: String,
    pub host: Host,
}

/// One ref chip. `name` is the branch's own short name — `master`, not
/// `origin/master` — or the tag's name.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RefChip {
    pub name: String,
    /// `Branch` when a local ref exists, `Remote` when it lives only on a
    /// remote, `Tag` for tags. Kept because it is what the gutter sorts and
    /// styles by; where the branch lives in detail is `local` and `remotes`.
    pub kind: RefKind,
    /// True for the branch HEAD points at. Drawn with an accent border and a check.
    pub current: bool,
    /// A local `refs/heads/` ref of this name points at this commit.
    pub local: bool,
    /// The remotes carrying this branch **at this commit**, in name order.
    pub remotes: Vec<RemoteMark>,
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

        let hosts = remote_hosts(repo);

        let platform = repo.references().map_err(|e| Error::Refs(e.to_string()))?;
        let iter = platform.all().map_err(|e| Error::Refs(e.to_string()))?;

        // Keyed by commit, then by what the chip *is*, so a local branch and its
        // remote counterpart at the same commit land on the same entry. Tags are
        // keyed apart from branches: a tag named `main` is not the branch.
        let mut merged: HashMap<ObjectId, HashMap<(bool, String), RefChip>> = HashMap::new();

        for reference in iter.filter_map(std::result::Result::ok) {
            let full = reference.name().as_bstr().to_string();

            // `remote` is `Some(name)` for a remote-tracking branch; `name` is
            // always the short name, so `origin/feature/x` splits at the *first*
            // slash into `origin` and `feature/x`.
            let (kind, name, remote) = if let Some(rest) = full.strip_prefix("refs/heads/") {
                (RefKind::Branch, rest.to_string(), None)
            } else if let Some(rest) = full.strip_prefix("refs/remotes/") {
                // `origin/HEAD` is a symbolic pointer, not a branch anyone wants
                // to see as a chip.
                if rest.ends_with("/HEAD") {
                    continue;
                }
                let Some((remote, branch)) = rest.split_once('/') else {
                    // A ref directly under refs/remotes with no remote name.
                    continue;
                };
                (
                    RefKind::Remote,
                    branch.to_string(),
                    Some(remote.to_string()),
                )
            } else if let Some(rest) = full.strip_prefix("refs/tags/") {
                (RefKind::Tag, rest.to_string(), None)
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

            // Counts stay per *ref*, not per chip: the rail reports how many
            // branches and remote-tracking branches exist, which merging must
            // not quietly halve.
            match kind {
                RefKind::Branch => index.counts.branches += 1,
                RefKind::Remote => index.counts.remotes += 1,
                RefKind::Tag => index.counts.tags += 1,
            }

            let is_tag = kind == RefKind::Tag;
            let entry = merged
                .entry(id)
                .or_default()
                .entry((is_tag, name.clone()))
                .or_insert_with(|| RefChip {
                    name: name.clone(),
                    kind,
                    current: false,
                    local: false,
                    remotes: Vec::new(),
                });

            match remote {
                Some(remote) => {
                    let host = hosts.get(&remote).copied().unwrap_or(Host::Generic);
                    if !entry.remotes.iter().any(|m| m.name == remote) {
                        entry.remotes.push(RemoteMark { name: remote, host });
                    }
                }
                None if !is_tag => {
                    entry.local = true;
                    // A chip with a local ref is a branch, whichever half of it
                    // was seen first.
                    entry.kind = RefKind::Branch;
                    if index.current_branch.as_deref() == Some(name.as_str()) {
                        entry.current = true;
                    }
                }
                None => {}
            }
        }

        for (id, chips) in merged {
            let mut chips: Vec<RefChip> = chips.into_values().collect();

            for chip in &mut chips {
                chip.remotes.sort_by(|a, b| a.name.cmp(&b.name));
            }

            // Order within a commit: the current branch first, then local
            // branches, then remote-only ones, then tags. The gutter is
            // right-aligned and collapses overflow, so the most important chip
            // has to be the one that survives.
            chips.sort_by(|a, b| {
                b.current
                    .cmp(&a.current)
                    .then(a.kind.cmp(&b.kind))
                    .then(a.name.cmp(&b.name))
            });

            index.by_commit.insert(id, chips);
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

/// Every configured remote's host, by remote name.
///
/// Read once per index build from the repository's own config. This is the only
/// place a remote URL is touched, and it is read — never contacted. The All
/// repositories screen's promise that nothing leaves the machine is not spent
/// on drawing a glyph.
fn remote_hosts(repo: &gix::Repository) -> HashMap<String, Host> {
    let mut out = HashMap::new();
    let snapshot = repo.config_snapshot();

    for name in repo.remote_names() {
        let name = name.to_string();
        // `pushurl` is deliberately ignored: the chip says where the branch was
        // fetched from, which is what the ref under refs/remotes/ represents.
        let url = snapshot
            .string(format!("remote.{name}.url").as_str())
            .map(|value| value.to_string());

        if let Some(url) = url {
            out.insert(name, Host::from_url(&url));
        }
    }

    out
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

    /// FEAT-036. This asserted `origin/main` as a chip of its own until the
    /// local branch and its remote were merged into one; the name `origin/main`
    /// no longer appears anywhere, because the word `origin` is a glyph now.
    #[test]
    fn a_local_branch_and_its_remote_at_the_same_commit_are_one_chip() {
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

        let main: Vec<&RefChip> = chips.iter().filter(|c| c.name == "main").collect();
        assert_eq!(main.len(), 1, "one branch, one chip: {chips:?}");

        let main = main[0];
        assert!(main.local, "the local ref is at this commit");
        assert_eq!(main.remotes.len(), 1);
        assert_eq!(main.remotes[0].name, "origin");
        assert_eq!(
            main.kind,
            RefKind::Branch,
            "it has a local ref, so it is a branch"
        );

        assert!(
            !names(&chips).iter().any(|n| n.contains('/')),
            "no chip repeats a remote name in its own label: {chips:?}"
        );
        assert!(
            !names(&chips).iter().any(|n| n.ends_with("HEAD")),
            "origin/HEAD is a pointer, not a branch anyone wants as a chip"
        );

        // Counts stay per ref, not per chip: the rail reports how many branches
        // and remote-tracking branches exist, and merging two refs into one chip
        // must not quietly halve either number. The fixture has three local
        // branches — main, feature/split-view and merged/already-in-main.
        assert_eq!(index.counts().remotes, 1);
        assert_eq!(index.counts().branches, 3);
    }

    /// The case that must **not** merge: the same name at two commits is two
    /// things, and the grouping is per commit precisely so that falls out.
    #[test]
    fn a_remote_that_has_fallen_behind_stays_its_own_chip() {
        let fixture = Fixture::woven();
        let head = fixture.head();
        let parent = fixture.rev("HEAD~1");

        fixture.git(&["update-ref", "refs/remotes/origin/main", &parent]);

        let index = RefIndex::build(&fixture.open()).expect("index");

        let at_head = index.chips_for(&gix::ObjectId::from_hex(head.as_bytes()).expect("id"));
        let at_parent = index.chips_for(&gix::ObjectId::from_hex(parent.as_bytes()).expect("id"));

        let local = at_head
            .iter()
            .find(|c| c.name == "main")
            .expect("local main");
        assert!(local.local);
        assert!(local.remotes.is_empty(), "the remote is not at this commit");

        let remote = at_parent
            .iter()
            .find(|c| c.name == "main")
            .expect("remote main");
        assert!(!remote.local, "no local ref is at the parent");
        assert_eq!(remote.remotes.len(), 1);
        assert_eq!(
            remote.kind,
            RefKind::Remote,
            "remote-only, so it styles as one"
        );
    }

    #[test]
    fn a_branch_on_two_remotes_carries_both() {
        let fixture = Fixture::woven();
        let head = fixture.head();
        fixture.git(&["update-ref", "refs/remotes/origin/main", &head]);
        fixture.git(&["update-ref", "refs/remotes/fork/main", &head]);

        let index = RefIndex::build(&fixture.open()).expect("index");
        let id = gix::ObjectId::from_hex(head.as_bytes()).expect("id");
        let chips = index.chips_for(&id);

        let main = chips.iter().find(|c| c.name == "main").expect("main");
        assert_eq!(
            main.remotes
                .iter()
                .map(|m| m.name.as_str())
                .collect::<Vec<_>>(),
            vec!["fork", "origin"],
            "remotes are in name order, so the chip is stable between refreshes"
        );
    }

    /// A remote branch whose name contains slashes splits at the **first** one:
    /// `origin/feature/x` is `feature/x` on `origin`, not `x` on `origin/feature`.
    #[test]
    fn a_slashed_branch_name_splits_at_the_remote() {
        let fixture = Fixture::woven();
        let head = fixture.head();
        fixture.git(&[
            "update-ref",
            "refs/remotes/origin/feature/split-view",
            &head,
        ]);

        let index = RefIndex::build(&fixture.open()).expect("index");
        let id = gix::ObjectId::from_hex(head.as_bytes()).expect("id");
        let chips = index.chips_for(&id);

        let chip = chips
            .iter()
            .find(|c| c.name == "feature/split-view")
            .expect("the branch keeps its slashes");
        assert_eq!(chip.remotes[0].name, "origin");
    }

    /// A tag and a branch can share a name and are not the same thing.
    #[test]
    fn a_tag_never_merges_with_a_branch_of_the_same_name() {
        let fixture = Fixture::woven();
        let head = fixture.head();
        fixture.git(&["tag", "main"]);

        let index = RefIndex::build(&fixture.open()).expect("index");
        let id = gix::ObjectId::from_hex(head.as_bytes()).expect("id");
        let chips = index.chips_for(&id);

        let named: Vec<&RefChip> = chips.iter().filter(|c| c.name == "main").collect();
        assert_eq!(named.len(), 2, "one branch and one tag: {chips:?}");
        assert!(named.iter().any(|c| c.kind == RefKind::Branch));
        assert!(named.iter().any(|c| c.kind == RefKind::Tag));
    }

    #[test]
    fn a_host_is_read_from_a_url_in_any_form_git_accepts() {
        use Host::*;
        for (url, want) in [
            ("https://github.com/o/r.git", GitHub),
            ("git@github.com:o/r.git", GitHub),
            ("ssh://git@github.com/o/r.git", GitHub),
            ("https://gitlab.com/o/r.git", GitLab),
            ("git@gitlab.example.org:o/r.git", GitLab),
            ("https://bitbucket.org/o/r.git", Bitbucket),
            ("https://dev.azure.com/o/p/_git/r", AzureDevOps),
            ("https://o.visualstudio.com/p/_git/r", AzureDevOps),
            ("https://git.sr.ht/~o/r", Generic),
            ("/srv/git/bare.git", Generic),
        ] {
            assert_eq!(Host::from_url(url), want, "{url}");
        }
    }

    /// The host must come from the *authority*, not from anywhere in the string.
    #[test]
    fn a_host_is_not_guessed_from_a_path_segment() {
        assert_eq!(
            Host::from_url("https://git.example.com/mirrors/github.com/o/r.git"),
            Host::Generic,
            "a path that mentions a forge is not that forge"
        );
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
