// SPDX-License-Identifier: GPL-3.0-or-later

//! Counts for the nav rail.
//!
//! The rail shows a number beside most items. Only the ones whose screens exist
//! are computed for real; the rest are [`None`] and the rail renders a `·`
//! rather than inventing a number. A wrong count is worse than no count — it is
//! the thing people use to decide whether a screen is worth opening.

use serde::Serialize;

use crate::diff::FileStatus;
use crate::error::{Error, Result};
use crate::refs::RefIndex;

/// One path in the working copy, and what happened to it on the side it was
/// found. The same [`FileStatus`] the Diff screen uses, so one glyph table
/// serves both.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StatusEntry {
    pub path: String,
    pub status: FileStatus,
}

/// The working copy, split the way the Commit screen shows it.
///
/// Three lists rather than one flag-carrying list: a path can be in `staged`
/// *and* `unstaged` at once — staged in part, or changed again afterwards — and
/// flattening that into a single row per path is exactly the lie that makes
/// people commit something they did not mean to.
#[derive(Debug, Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkingCopy {
    /// `HEAD` against the index: what a commit right now would contain.
    pub staged: Vec<StatusEntry>,
    /// The index against the working tree, plus untracked files: what a commit
    /// right now would leave behind.
    pub unstaged: Vec<StatusEntry>,
    /// Paths the index holds at stages 1 to 3. Not committable until resolved.
    pub conflicted: Vec<StatusEntry>,
}

impl WorkingCopy {
    /// Distinct paths with anything at all going on, which is what
    /// `git status --porcelain` prints one line each for.
    pub fn changed_paths(&self) -> usize {
        let mut paths: Vec<&str> = self
            .staged
            .iter()
            .chain(&self.unstaged)
            .chain(&self.conflicted)
            .map(|e| e.path.as_str())
            .collect();
        paths.sort_unstable();
        paths.dedup();
        paths.len()
    }
}

/// Read the working copy.
///
/// This is the full status walk — a directory traversal plus an entry-by-entry
/// comparison plus a tree-to-index diff — so it is the expensive call in this
/// module, and the reason the rail's working-copy count arrived only with the
/// screen that needed the walk anyway.
pub fn working_copy(repo: &gix::Repository) -> Result<WorkingCopy> {
    use gix::status::index_worktree::Item as IndexWorktreeItem;
    use gix::status::Item;
    use gix::status::UntrackedFiles;

    let mut out = WorkingCopy::default();

    let iter = repo
        .status(gix::progress::Discard)
        .map_err(|e| Error::Status(e.to_string()))?
        // Each untracked file individually. Collapsing them into their parent
        // directory would mean the screen could not offer to stage one.
        .untracked_files(UntrackedFiles::Files)
        .into_iter(None)
        .map_err(|e| Error::Status(e.to_string()))?;

    for item in iter {
        let item = item.map_err(|e| Error::Status(e.to_string()))?;

        match item {
            Item::TreeIndex(change) => {
                let (path, status) = tree_index_change(&change);
                out.staged.push(StatusEntry { path, status });
            }
            Item::IndexWorktree(IndexWorktreeItem::Modification {
                rela_path, status, ..
            }) => {
                let path = rela_path.to_string();
                match index_worktree_modification(&status) {
                    // A conflict is not an unstaged change: it is a path with
                    // no single index version at all, and nothing can be
                    // committed until it is resolved.
                    Some(Change::Conflicted) => out.conflicted.push(StatusEntry {
                        path,
                        status: FileStatus::Modified,
                    }),
                    Some(Change::Unstaged(status)) => {
                        out.unstaged.push(StatusEntry { path, status });
                    }
                    None => {}
                }
            }
            Item::IndexWorktree(IndexWorktreeItem::DirectoryContents { entry, .. }) => {
                if entry.status == gix::dir::entry::Status::Untracked {
                    out.unstaged.push(StatusEntry {
                        path: entry.rela_path.to_string(),
                        status: FileStatus::Untracked,
                    });
                }
            }
            Item::IndexWorktree(IndexWorktreeItem::Rewrite {
                dirwalk_entry,
                copy,
                ..
            }) => {
                out.unstaged.push(StatusEntry {
                    path: dirwalk_entry.rela_path.to_string(),
                    status: if copy {
                        FileStatus::Added
                    } else {
                        FileStatus::Renamed
                    },
                });
            }
        }
    }

    sort_by_path(&mut out.staged);
    sort_by_path(&mut out.unstaged);
    sort_by_path(&mut out.conflicted);

    Ok(out)
}

fn sort_by_path(entries: &mut [StatusEntry]) {
    entries.sort_by(|a, b| a.path.cmp(&b.path));
}

/// What a `HEAD`-to-index change means. `rhs` is the index, so an addition is
/// something staged for adding.
fn tree_index_change(change: &gix::diff::index::Change) -> (String, FileStatus) {
    use gix::diff::index::Change;

    match change {
        Change::Addition { location, .. } => (location.to_string(), FileStatus::Added),
        Change::Deletion { location, .. } => (location.to_string(), FileStatus::Deleted),
        Change::Modification { location, .. } => (location.to_string(), FileStatus::Modified),
        Change::Rewrite { location, .. } => (location.to_string(), FileStatus::Renamed),
    }
}

/// Which list an index-to-worktree change belongs in.
enum Change {
    Unstaged(FileStatus),
    Conflicted,
}

/// What an index-to-worktree change means for one tracked path.
///
/// `None` for the states that are not changes: an entry whose only news is a
/// stat that could be cached, and an `intent-to-add` placeholder, which is a
/// promise to add a file rather than a change to one.
fn index_worktree_modification(
    status: &gix::status::plumbing::index_as_worktree::EntryStatus<(), gix::submodule::Status>,
) -> Option<Change> {
    use gix::status::plumbing::index_as_worktree::{Change as WorktreeChange, EntryStatus};

    match status {
        EntryStatus::Conflict { .. } => Some(Change::Conflicted),
        EntryStatus::Change(WorktreeChange::Removed) => Some(Change::Unstaged(FileStatus::Deleted)),
        EntryStatus::Change(
            WorktreeChange::Type { .. }
            | WorktreeChange::Modification { .. }
            | WorktreeChange::SubmoduleModification(_),
        ) => Some(Change::Unstaged(FileStatus::Modified)),
        EntryStatus::NeedsUpdate(_) | EntryStatus::IntentToAdd => None,
    }
}

#[derive(Debug, Clone, Copy, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoCounts {
    /// Commits delivered by the graph walk so far. Filled in by the caller,
    /// since only the walk knows it.
    pub commits: Option<usize>,
    /// Distinct paths with something going on — the rail's Working copy count,
    /// and the same number `git status --porcelain` prints a line for.
    pub working: Option<usize>,
    /// Paths staged for the next commit. What the toolbar's Commit button
    /// counts, because staged is what a commit would actually contain.
    pub staged: Option<usize>,
    pub conflicts: Option<usize>,
    pub branches: Option<usize>,
    pub stashes: Option<usize>,
    pub tags: Option<usize>,
    pub submodules: Option<usize>,
}

/// Counts for the rail.
///
/// Everything except the working copy is cheap: refs, the stash reflog and the
/// submodule list. The working-copy figures need the full status walk, so a
/// bare repository — which has no working copy at all — reports them as `None`
/// rather than zero.
pub fn counts(repo: &gix::Repository, refs: &RefIndex) -> Result<RepoCounts> {
    let ref_counts = refs.counts();

    // A failed status walk is not a reason to fail the whole snapshot: the
    // rest of the rail is still true, and `None` renders as `·`.
    let work = repo
        .workdir()
        .is_some()
        .then(|| working_copy(repo).ok())
        .flatten();

    Ok(RepoCounts {
        commits: None,
        working: work.as_ref().map(WorkingCopy::changed_paths),
        staged: work.as_ref().map(|w| w.staged.len()),
        conflicts: work.as_ref().map(|w| w.conflicted.len()),
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
    fn the_commit_count_is_still_the_walks_to_report() {
        // A wrong count is worse than no count: it is what people use to decide
        // whether a screen is worth opening. The working-copy figures became
        // real when the status walk arrived; the commit count cannot, because
        // only the walk knows how far it has got.
        let counts = counts_for(&Fixture::dirty());

        assert_eq!(counts.commits, None);
        assert!(counts.working.is_some());
        assert!(counts.conflicts.is_some());
    }

    #[test]
    fn a_bare_repository_reports_no_working_copy_rather_than_an_empty_one() {
        let dir = tempfile::tempdir().expect("temp dir");
        std::process::Command::new("git")
            .args(["init", "-q", "--bare"])
            .arg(dir.path())
            .output()
            .expect("git init --bare");

        let repo = crate::repo::open(dir.path()).expect("open");
        let refs = RefIndex::build(&repo).expect("index");
        let counts = counts(&repo, &refs).expect("counts");

        assert_eq!(counts.working, None);
        assert_eq!(counts.staged, None);
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

#[cfg(test)]
mod working_copy_tests {
    use super::*;
    use crate::fixture::Fixture;

    fn paths(entries: &[StatusEntry]) -> Vec<&str> {
        entries.iter().map(|e| e.path.as_str()).collect()
    }

    fn status_of<'a>(entries: &'a [StatusEntry], path: &str) -> Option<&'a FileStatus> {
        entries.iter().find(|e| e.path == path).map(|e| &e.status)
    }

    #[test]
    fn a_clean_working_copy_has_nothing_in_any_list() {
        let work = working_copy(&Fixture::woven().open()).expect("status");

        assert!(work.staged.is_empty());
        assert!(work.unstaged.is_empty());
        assert!(work.conflicted.is_empty());
        assert_eq!(work.changed_paths(), 0);
    }

    #[test]
    fn staged_unstaged_and_untracked_land_in_the_right_lists() {
        let fixture = Fixture::dirty();
        let work = working_copy(&fixture.open()).expect("status");

        assert_eq!(paths(&work.staged), vec!["notes.md"]);
        assert_eq!(
            status_of(&work.staged, "notes.md"),
            Some(&FileStatus::Modified)
        );

        assert!(paths(&work.unstaged).contains(&"core.txt"));
        assert_eq!(
            status_of(&work.unstaged, "core.txt"),
            Some(&FileStatus::Modified)
        );

        assert!(paths(&work.unstaged).contains(&"untracked.txt"));
        assert_eq!(
            status_of(&work.unstaged, "untracked.txt"),
            Some(&FileStatus::Untracked)
        );
    }

    #[test]
    fn the_lists_match_git_status() {
        let fixture = Fixture::dirty();
        let work = working_copy(&fixture.open()).expect("status");

        let porcelain = fixture.git(&["status", "--porcelain"]);
        let expected = porcelain.lines().count();

        assert_eq!(work.changed_paths(), expected);
    }

    #[test]
    fn a_path_staged_and_then_changed_again_appears_in_both_lists() {
        // Flattening this into one row is exactly the lie that makes people
        // commit something they did not mean to.
        let fixture = Fixture::woven();
        fixture.write("notes.md", "staged version\n");
        fixture.git(&["add", "notes.md"]);
        fixture.write("notes.md", "and then changed again\n");

        let work = working_copy(&fixture.open()).expect("status");

        assert!(paths(&work.staged).contains(&"notes.md"));
        assert!(paths(&work.unstaged).contains(&"notes.md"));
        assert_eq!(work.changed_paths(), 1, "it is still one file");
    }

    #[test]
    fn a_staged_addition_reads_as_added() {
        let fixture = Fixture::woven();
        fixture.write("brand-new.txt", "hello\n");
        fixture.git(&["add", "brand-new.txt"]);

        let work = working_copy(&fixture.open()).expect("status");

        assert_eq!(
            status_of(&work.staged, "brand-new.txt"),
            Some(&FileStatus::Added)
        );
    }

    #[test]
    fn a_staged_deletion_reads_as_deleted() {
        let fixture = Fixture::woven();
        fixture.remove("notes.md");
        fixture.git(&["add", "-A"]);

        let work = working_copy(&fixture.open()).expect("status");

        assert_eq!(
            status_of(&work.staged, "notes.md"),
            Some(&FileStatus::Deleted)
        );
    }

    #[test]
    fn a_file_deleted_but_not_staged_reads_as_an_unstaged_deletion() {
        let fixture = Fixture::woven();
        fixture.remove("notes.md");

        let work = working_copy(&fixture.open()).expect("status");

        assert_eq!(
            status_of(&work.unstaged, "notes.md"),
            Some(&FileStatus::Deleted)
        );
        assert!(work.staged.is_empty());
    }

    #[test]
    fn untracked_files_are_listed_individually_rather_than_as_their_directory() {
        // Collapsed into a directory, the screen could not offer to stage one.
        let fixture = Fixture::woven();
        fixture.write("new/one.txt", "1\n");
        fixture.write("new/two.txt", "2\n");

        let work = working_copy(&fixture.open()).expect("status");

        assert!(paths(&work.unstaged).contains(&"new/one.txt"));
        assert!(paths(&work.unstaged).contains(&"new/two.txt"));
    }

    #[test]
    fn ignored_files_are_not_listed() {
        let fixture = Fixture::woven();
        fixture.write(".cache/junk", "ignored\n");

        let work = working_copy(&fixture.open()).expect("status");

        assert!(!paths(&work.unstaged)
            .iter()
            .any(|p| p.starts_with(".cache")));
    }

    #[test]
    fn a_conflicted_path_is_neither_staged_nor_unstaged() {
        let fixture = Fixture::conflicted();
        let work = working_copy(&fixture.open()).expect("status");

        assert_eq!(paths(&work.conflicted), vec!["shared.txt"]);
        assert!(!paths(&work.staged).contains(&"shared.txt"));
        assert!(!paths(&work.unstaged).contains(&"shared.txt"));
    }

    #[test]
    fn entries_are_sorted_by_path() {
        let fixture = Fixture::woven();
        for name in ["c.txt", "a.txt", "b.txt"] {
            fixture.write(name, "x\n");
        }

        let work = working_copy(&fixture.open()).expect("status");
        let listed: Vec<&str> = paths(&work.unstaged);
        let mut sorted = listed.clone();
        sorted.sort_unstable();

        assert_eq!(listed, sorted);
    }

    #[test]
    fn the_rail_counts_come_from_the_walk() {
        let fixture = Fixture::dirty();
        let repo = fixture.open();
        let refs = RefIndex::build(&repo).expect("index");

        let counts = counts(&repo, &refs).expect("counts");

        assert_eq!(counts.staged, Some(1));
        assert_eq!(counts.conflicts, Some(0));
        assert_eq!(
            counts.working,
            Some(fixture.git(&["status", "--porcelain"]).lines().count())
        );
    }
}
