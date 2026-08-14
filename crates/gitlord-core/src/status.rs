// SPDX-License-Identifier: GPL-3.0-or-later

//! Counts for the nav rail.
//!
//! The rail shows a number beside most items. Only the ones whose screens exist
//! are computed for real; the rest are [`None`] and the rail renders a `·`
//! rather than inventing a number. A wrong count is worse than no count — it is
//! the thing people use to decide whether a screen is worth opening.

use serde::Serialize;

use crate::error::Result;
use crate::refs::RefIndex;

#[derive(Debug, Clone, Copy, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoCounts {
    /// Commits delivered by the graph walk so far. Filled in by the caller,
    /// since only the walk knows it.
    pub commits: Option<usize>,
    pub working: Option<usize>,
    pub conflicts: Option<usize>,
    pub branches: Option<usize>,
    pub stashes: Option<usize>,
    pub tags: Option<usize>,
    pub submodules: Option<usize>,
}

/// Counts that are cheap and exact: everything derivable from refs, plus the
/// stash and submodule lists.
pub fn counts(repo: &gix::Repository, refs: &RefIndex) -> Result<RepoCounts> {
    let ref_counts = refs.counts();

    Ok(RepoCounts {
        commits: None,
        // Working-copy and conflict counts arrive with the Working copy and
        // Conflicts screens, which need the full status walk anyway.
        working: None,
        conflicts: None,
        branches: Some(ref_counts.branches),
        stashes: stash_count(repo),
        tags: Some(ref_counts.tags),
        submodules: submodule_count(repo),
    })
}

/// Stash entries are the reflog of `refs/stash`; `stash@{n}` is literally the
/// nth reflog entry. No reflog means no stash, which is not an error.
fn stash_count(repo: &gix::Repository) -> Option<usize> {
    let stash = repo.find_reference("refs/stash").ok()?;
    let mut platform = stash.log_iter();
    let entries = platform.all().ok()??;
    Some(entries.filter_map(std::result::Result::ok).count())
}

/// Submodules are declared in `.gitmodules`. A repository with no submodules
/// has no such file, and reports zero rather than nothing.
fn submodule_count(repo: &gix::Repository) -> Option<usize> {
    match repo.submodules() {
        Ok(Some(iter)) => Some(iter.count()),
        Ok(None) => Some(0),
        Err(_) => None,
    }
}
