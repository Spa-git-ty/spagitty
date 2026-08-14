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

            index
                .by_commit
                .entry(id)
                .or_default()
                .push(RefChip { name, kind, current });
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
