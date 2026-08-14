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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fixture::Fixture;

    fn counts_for(fixture: &Fixture) -> RepoCounts {
        let repo = fixture.open();
        let refs = RefIndex::build(&repo).expect("index");
        counts(&repo, &refs).expect("counts")
    }

    #[test]
    fn ref_derived_counts_come_from_the_index() {
        let counts = counts_for(&Fixture::woven());

        assert_eq!(counts.branches, Some(3));
        assert_eq!(counts.tags, Some(2));
    }

    #[test]
    fn counts_for_screens_that_do_not_exist_are_absent_rather_than_zero() {
        // A wrong count is worse than no count: it is what people use to decide
        // whether a screen is worth opening.
        let counts = counts_for(&Fixture::dirty());

        assert_eq!(
            counts.commits, None,
            "only the walk knows how many commits there are"
        );
        assert_eq!(counts.working, None);
        assert_eq!(counts.conflicts, None);
    }

    #[test]
    fn stash_entries_are_counted_from_the_reflog() {
        let fixture = Fixture::woven();
        assert_eq!(counts_for(&fixture).stashes, Some(1));

        fixture.write("notes.md", "another change\n");
        fixture.git(&["stash", "push", "-q", "-m", "second"]);

        assert_eq!(counts_for(&fixture).stashes, Some(2));
    }

    #[test]
    fn no_stash_is_none_rather_than_an_error() {
        let fixture = Fixture::empty();
        fixture.write("a.txt", "a\n");
        fixture.git(&["add", "-A"]);
        fixture.commit("Only commit");

        assert_eq!(
            counts_for(&fixture).stashes,
            None,
            "no refs/stash means no reflog to read"
        );
    }

    #[test]
    fn a_repository_without_submodules_reports_zero_rather_than_nothing() {
        assert_eq!(counts_for(&Fixture::woven()).submodules, Some(0));
    }

    #[test]
    fn declared_submodules_are_counted() {
        let fixture = Fixture::woven();
        fixture.write(
            ".gitmodules",
            "[submodule \"vendor/lib\"]\n\tpath = vendor/lib\n\turl = ../lib.git\n",
        );
        fixture.git(&["add", ".gitmodules"]);
        fixture.commit("Declare a submodule");

        assert_eq!(counts_for(&fixture).submodules, Some(1));
    }

    #[test]
    fn an_empty_repository_counts_nothing_without_failing() {
        let counts = counts_for(&Fixture::empty());

        assert_eq!(counts.branches, Some(0));
        assert_eq!(counts.tags, Some(0));
        assert_eq!(counts.stashes, None);
    }
}
