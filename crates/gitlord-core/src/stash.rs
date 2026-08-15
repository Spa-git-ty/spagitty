// SPDX-License-Identifier: GPL-3.0-or-later

//! Stash entries.
//!
//! A stash is not a special kind of object. It is a commit whose first parent
//! is the commit the work was made on, and `refs/stash` is an ordinary ref
//! whose *reflog* is the list: `stash@{n}` is literally the nth reflog entry,
//! newest first. So enumerating stashes means reading a reflog, and showing
//! what is in one means diffing a commit against its first parent — which is
//! exactly what the Diff screen already does.
//!
//! That is why there is no diffing code here. The rows carry the stash commit's
//! id, and the detail panel asks `diff::commit_diff` about it like any other
//! commit.

use serde::Serialize;

use crate::error::{Error, Result};
use crate::graph::short_id;
use crate::shell;

/// One `stash@{n}`.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StashEntry {
    /// `n` in `stash@{n}`. 0 is the most recent.
    pub index: usize,
    /// `stash@{n}`, for the ref chip. The name git itself uses.
    pub name: String,
    /// The stash commit. Ask `commit_diff` about this to see what is in it.
    pub id: String,
    pub short: String,
    /// What the entry says about itself: `On main: wip on notes`.
    pub message: String,
    /// When it was stashed, unix seconds.
    pub time: i64,
    pub author_name: String,
    /// The commit the work was made on — the row it hangs off.
    pub parent: String,
    pub parent_short: String,
    /// First line of that commit's message, so the entry has somewhere to point.
    pub parent_summary: String,
}

/// Every stash entry, newest first.
///
/// A repository with no stash has no `refs/stash` at all, which is an empty
/// list rather than an error.
pub fn list(repo: &gix::Repository) -> Result<Vec<StashEntry>> {
    let Ok(stash) = repo.find_reference("refs/stash") else {
        return Ok(Vec::new());
    };

    let mut platform = stash.log_iter();
    let Some(entries) = platform.all().map_err(|e| Error::Refs(e.to_string()))? else {
        return Ok(Vec::new());
    };

    // The reflog is oldest first on disk; `stash@{0}` is the newest.
    let lines: Vec<_> = entries.filter_map(std::result::Result::ok).collect();

    let mut out = Vec::with_capacity(lines.len());
    for (index, line) in lines.iter().rev().enumerate() {
        // The reflog is borrowed text: ids are hex and times are unparsed.
        let Ok(id) = gix::ObjectId::from_hex(line.new_oid) else {
            continue;
        };
        let Ok(commit) = repo.find_commit(id) else {
            // The entry's commit has been garbage collected. The reflog line
            // survives it; the entry does not.
            continue;
        };

        let parent = commit.parent_ids().next().map(|p| p.detach());
        let parent_summary = parent
            .and_then(|p| repo.find_commit(p).ok())
            .and_then(|c| c.message().ok().map(|m| m.summary().to_string()))
            .unwrap_or_default();

        out.push(StashEntry {
            index,
            name: format!("stash@{{{index}}}"),
            id: id.to_string(),
            short: short_id(&id),
            message: line.message.to_string(),
            time: line.signature.time().map(|t| t.seconds).unwrap_or(0),
            author_name: line.signature.name.to_string(),
            parent: parent.map(|p| p.to_string()).unwrap_or_default(),
            parent_short: parent.as_ref().map(short_id).unwrap_or_default(),
            parent_summary,
        });
    }

    Ok(out)
}

/// Stash the working copy.
///
/// Through `git` for the reasons in [`crate::shell`]'s header: this writes the
/// index, the working tree and a ref, and it is the operation whose on-disk
/// shape every other tool reads as "a stash".
///
/// Refused when there is nothing to stash. `git stash push` succeeds quietly in
/// that case, printing "No local changes to save" and creating no entry — which
/// from a button reads as a stash that happened and then vanished.
pub fn push(repo: &gix::Repository, message: &str, include_untracked: bool) -> Result<()> {
    let workdir = repo
        .workdir()
        .ok_or_else(|| Error::NotStageable("a bare repository has no working copy".into()))?;

    if !anything_to_stash(repo, include_untracked)? {
        return Err(Error::NotStageable(if include_untracked {
            "there is nothing to stash".into()
        } else {
            "there is nothing to stash — the only changes are untracked files".into()
        }));
    }

    shell::stash_push(workdir, message.trim(), include_untracked)
}

/// Would `git stash push` with these options actually save anything?
fn anything_to_stash(repo: &gix::Repository, include_untracked: bool) -> Result<bool> {
    let work = crate::status::working_copy(repo)?;

    if !work.staged.is_empty() || !work.conflicted.is_empty() {
        return Ok(true);
    }

    Ok(work.unstaged.iter().any(|entry| {
        // An untracked file is only stashable when it was asked for.
        entry.status != crate::diff::FileStatus::Untracked || include_untracked
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fixture::Fixture;

    #[test]
    fn a_repository_with_no_stash_has_an_empty_list_rather_than_an_error() {
        let fixture = Fixture::empty();
        fixture.write("a.txt", "a\n");
        fixture.git(&["add", "-A"]);
        fixture.commit("Only commit");

        assert!(list(&fixture.open()).expect("list").is_empty());
    }

    #[test]
    fn entries_are_newest_first_and_named_the_way_git_names_them() {
        let fixture = Fixture::woven();
        fixture.write("notes.md", "second\n");
        fixture.git(&["stash", "push", "-q", "-m", "second"]);

        let entries = list(&fixture.open()).expect("list");

        assert_eq!(entries.len(), 2);
        assert_eq!(entries[0].index, 0);
        assert_eq!(entries[0].name, "stash@{0}");
        assert!(entries[0].message.contains("second"));
        assert_eq!(entries[1].name, "stash@{1}");
        assert!(entries[1].message.contains("wip on notes"));
    }

    #[test]
    fn the_list_matches_git_stash_list() {
        let fixture = Fixture::woven();
        fixture.write("core.txt", "another\n");
        fixture.git(&["stash", "push", "-q", "-m", "another"]);

        let entries = list(&fixture.open()).expect("list");
        let expected: Vec<String> = fixture
            .git(&["stash", "list", "--format=%H"])
            .lines()
            .map(str::to_string)
            .collect();

        assert_eq!(
            entries.iter().map(|e| e.id.clone()).collect::<Vec<_>>(),
            expected
        );
    }

    #[test]
    fn an_entry_hangs_off_the_commit_it_was_made_on() {
        let fixture = Fixture::woven();
        let base = fixture.head();

        let entry = list(&fixture.open()).expect("list").remove(0);

        assert_eq!(entry.parent, base);
        assert_eq!(entry.parent_short, base[..7]);
        assert_eq!(entry.parent_summary, "Merge feature/split-view");
    }

    #[test]
    fn an_entry_carries_who_stashed_it_and_when() {
        let entry = list(&Fixture::woven().open()).expect("list").remove(0);

        assert_eq!(entry.author_name, "Ada Lovelace");
        assert!(entry.time > 0);
        assert_eq!(entry.short, entry.id[..7]);
    }

    #[test]
    fn what_is_in_an_entry_is_the_diff_against_its_parent() {
        // The whole reason there is no diffing code in this module.
        let fixture = Fixture::woven();
        let entry = list(&fixture.open()).expect("list").remove(0);

        let diff = crate::diff::commit_diff(&fixture.open(), &entry.id).expect("diff");
        let paths: Vec<&str> = diff.files.iter().map(|f| f.path.as_str()).collect();

        assert_eq!(paths, vec!["notes.md"]);
        let expected = fixture.git(&["stash", "show", "--name-only", "stash@{0}"]);
        assert_eq!(expected.trim(), "notes.md");
    }

    #[test]
    fn stashing_cleans_the_working_copy_and_adds_the_newest_entry() {
        let fixture = Fixture::woven();
        fixture.write("core.txt", "work in progress\n");

        push(&fixture.open(), "  from gitlord  ", false).expect("push");

        assert_eq!(fixture.git(&["status", "--porcelain"]).trim(), "");
        let entries = list(&fixture.open()).expect("list");
        assert_eq!(entries.len(), 2);
        assert!(entries[0].message.contains("from gitlord"));
    }

    #[test]
    fn stashing_leaves_untracked_files_alone_unless_asked() {
        let fixture = Fixture::woven();
        fixture.write("core.txt", "tracked change\n");
        fixture.write("brand-new.txt", "untracked\n");

        push(&fixture.open(), "tracked only", false).expect("push");

        assert!(fixture.path().join("brand-new.txt").exists());
        assert!(fixture
            .git(&["status", "--porcelain"])
            .contains("brand-new.txt"));
    }

    #[test]
    fn stashing_can_take_untracked_files_too() {
        let fixture = Fixture::woven();
        fixture.write("brand-new.txt", "untracked\n");

        push(&fixture.open(), "with untracked", true).expect("push");

        assert!(!fixture.path().join("brand-new.txt").exists());
        assert_eq!(fixture.git(&["status", "--porcelain"]).trim(), "");
    }

    #[test]
    fn stashing_nothing_is_refused_rather_than_reported_as_done() {
        // `git stash push` succeeds quietly with nothing to save, which from a
        // button reads as a stash that happened and then vanished.
        let fixture = Fixture::woven();
        let before = list(&fixture.open()).expect("list").len();

        let error = push(&fixture.open(), "nothing to say", false).unwrap_err();

        assert!(matches!(error, Error::NotStageable(_)));
        assert_eq!(list(&fixture.open()).expect("list").len(), before);
    }

    #[test]
    fn untracked_files_alone_are_not_something_to_stash_unless_asked() {
        let fixture = Fixture::woven();
        fixture.write("brand-new.txt", "untracked\n");

        let error = push(&fixture.open(), "only untracked", false).unwrap_err();
        match error {
            Error::NotStageable(message) => assert!(message.contains("untracked")),
            other => panic!("expected a reason mentioning untracked files, got {other:?}"),
        }

        // With untracked included, the same working copy is stashable.
        push(&fixture.open(), "only untracked", true).expect("push");
        assert_eq!(list(&fixture.open()).expect("list").len(), 2);
    }

    #[test]
    fn a_bare_repository_has_no_working_copy_to_stash() {
        let dir = tempfile::tempdir().expect("temp dir");
        std::process::Command::new("git")
            .args(["init", "-q", "--bare"])
            .arg(dir.path())
            .output()
            .expect("git init --bare");

        let repo = crate::repo::open(dir.path()).expect("open");

        assert!(matches!(
            push(&repo, "anything", false).unwrap_err(),
            Error::NotStageable(_)
        ));
    }
}
