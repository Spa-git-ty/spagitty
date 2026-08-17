// SPDX-License-Identifier: GPL-3.0-or-later

//! Opening a repository and describing it.

use std::path::{Path, PathBuf};

use serde::Serialize;

use crate::error::{Error, Result};
use crate::graph::short_id;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HeadInfo {
    /// Short branch name, or None when HEAD is detached.
    pub branch: Option<String>,
    pub detached: bool,
    /// Full commit id HEAD resolves to, or None in an unborn repository.
    pub id: Option<String>,
    pub short: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoInfo {
    /// Absolute path to the working directory (or the git dir, if bare).
    pub path: PathBuf,
    /// Directory name, shown in the title bar.
    pub name: String,
    pub bare: bool,
    pub head: HeadInfo,
}

/// Open the repository at `path`, or the one that contains it.
///
/// Discovery walks upward, so pointing at a subdirectory works the same way
/// running `git` there would.
pub fn open(path: &Path) -> Result<gix::Repository> {
    if !path.exists() {
        return Err(Error::NotARepository(path.to_path_buf()));
    }
    gix::discover(path).map_err(|_| Error::NotARepository(path.to_path_buf()))
}

/// Open a repository as a `Send + Sync` handle.
///
/// A [`gix::Repository`] carries thread-local object caches, so it cannot be
/// shared across threads directly. The sync form can be, and each thread turns
/// it back into a local handle with `to_thread_local()`. That is what lets the
/// graph worker thread and the command handlers share one open repository
/// instead of re-discovering it on every call.
pub fn open_sync(path: &Path) -> Result<gix::ThreadSafeRepository> {
    Ok(open(path)?.into_sync())
}

/// One card on the All repositories screen.
///
/// Read without opening the repository as GitLord's *current* one: no walk, no
/// worker, no watcher. A repository that is not there any more is reported as
/// missing rather than dropped from the list — a path that has moved is
/// something the user should see, not something the list should quietly forget.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoSummary {
    pub path: PathBuf,
    pub name: String,
    /// False when the path is gone, or is no longer a repository. Every field
    /// below is then a default and means nothing.
    pub present: bool,
    pub bare: bool,
    /// Short branch name, or `None` when detached or unborn.
    pub branch: Option<String>,
    pub detached: bool,
    pub short: Option<String>,
    /// First line of the tip's message, so a card says what it was last doing.
    pub summary: Option<String>,
    /// Author time of the tip, unix seconds.
    pub time: Option<i64>,
    /// Distinct changed paths, or `None` for a bare repository.
    pub dirty: Option<usize>,
    pub conflicts: Option<usize>,
    pub stashes: Option<usize>,
    pub branches: Option<usize>,
}

/// Describe a repository without making it the open one.
///
/// Never fails: a missing or broken path is a card that says so. The list this
/// fills is the user's own record of where their work is, and one bad entry
/// must not take the screen down with it.
pub fn summary(path: &Path) -> RepoSummary {
    let name = path
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_else(|| path.to_string_lossy().into_owned());

    let missing = RepoSummary {
        path: path.to_path_buf(),
        name: name.clone(),
        present: false,
        bare: false,
        branch: None,
        detached: false,
        short: None,
        summary: None,
        time: None,
        dirty: None,
        conflicts: None,
        stashes: None,
        branches: None,
    };

    let Ok(repository) = open(path) else {
        return missing;
    };

    let head = head(&repository);
    let tip = head
        .id
        .as_ref()
        .and_then(|id| gix::ObjectId::from_hex(id.as_bytes()).ok())
        .and_then(|id| repository.find_commit(id).ok());

    let refs = crate::refs::RefIndex::build(&repository).ok();
    let counts = refs
        .as_ref()
        .and_then(|refs| crate::status::counts(&repository, refs).ok());

    RepoSummary {
        present: true,
        bare: repository.workdir().is_none(),
        summary: tip
            .as_ref()
            .and_then(|c| c.message().ok().map(|m| m.summary().to_string())),
        time: tip
            .as_ref()
            .and_then(|c| c.author().ok())
            .and_then(|sig| sig.time().ok().map(|t| t.seconds)),
        dirty: counts.as_ref().and_then(|c| c.working),
        conflicts: counts.as_ref().and_then(|c| c.conflicts),
        stashes: counts.as_ref().and_then(|c| c.stashes),
        branches: counts.as_ref().and_then(|c| c.branches),
        branch: head.branch,
        detached: head.detached,
        short: head.short,
        ..missing
    }
}

/// The working directory to run `git` in.
///
/// One definition, because every write in the crate needs it and a bare
/// repository has to be refused by all of them with the same sentence.
pub fn workdir(repo: &gix::Repository) -> Result<&Path> {
    repo.workdir()
        .ok_or_else(|| Error::NotStageable("a bare repository has no working copy".into()))
}

pub fn info(repo: &gix::Repository) -> Result<RepoInfo> {
    let path = repo
        .workdir()
        .unwrap_or_else(|| repo.git_dir())
        .to_path_buf();

    let name = path
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_else(|| path.to_string_lossy().into_owned());

    Ok(RepoInfo {
        path,
        name,
        bare: repo.workdir().is_none(),
        head: head(repo),
    })
}

/// Describe HEAD. An unborn HEAD (fresh `git init`) is not an error — it is a
/// repository with no commits yet, and the UI has to say so rather than fail.
pub fn head(repo: &gix::Repository) -> HeadInfo {
    let Ok(mut head) = repo.head() else {
        return HeadInfo {
            branch: None,
            detached: false,
            id: None,
            short: None,
        };
    };

    let branch = head.referent_name().map(|n| n.shorten().to_string());
    // `try_` because an unborn HEAD resolves to nothing: a fresh `git init` is a
    // valid repository with no commits, not a failure.
    let id = head.try_peel_to_id().ok().flatten().map(|id| id.detach());

    HeadInfo {
        detached: branch.is_none() && id.is_some(),
        branch,
        short: id.as_ref().map(short_id),
        id: id.map(|id| id.to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fixture::Fixture;

    #[test]
    fn opening_a_path_that_is_not_there_names_the_path() {
        let missing = std::path::Path::new("/nowhere/at/all");
        let error = open(missing).unwrap_err();
        assert!(matches!(error, Error::NotARepository(p) if p == missing));
    }

    #[test]
    fn opening_a_directory_that_is_not_a_repository_is_not_a_repository() {
        let dir = tempfile::tempdir().expect("temp dir");
        assert!(matches!(
            open(dir.path()).unwrap_err(),
            Error::NotARepository(_)
        ));
    }

    #[test]
    fn discovery_walks_upward_the_way_git_does() {
        let fixture = Fixture::woven();
        let nested = fixture.path().join("src/deep/nested");

        let repo = open(&nested).expect("discovering from a subdirectory");

        assert_eq!(
            repo.workdir()
                .expect("a working directory")
                .canonicalize()
                .ok(),
            fixture.path().canonicalize().ok()
        );
    }

    #[test]
    fn info_names_the_repository_after_its_directory() {
        let fixture = Fixture::woven();
        let info = info(&fixture.open()).expect("info");

        assert_eq!(
            info.name,
            fixture.path().file_name().unwrap().to_string_lossy()
        );
        assert!(!info.bare);
        assert_eq!(info.head.branch.as_deref(), Some("main"));
    }

    #[test]
    fn head_resolves_to_the_commit_it_points_at() {
        let fixture = Fixture::woven();
        let head = head(&fixture.open());

        assert_eq!(head.id.as_deref(), Some(fixture.head().as_str()));
        assert_eq!(head.short.as_deref(), Some(&fixture.head()[..7]));
        assert!(!head.detached);
    }

    #[test]
    fn an_unborn_head_is_a_repository_with_no_commits_rather_than_a_failure() {
        let fixture = Fixture::empty();
        let head = head(&fixture.open());

        assert_eq!(
            head.branch.as_deref(),
            Some("main"),
            "the branch exists before any commit"
        );
        assert_eq!(head.id, None);
        assert_eq!(head.short, None);
        assert!(!head.detached, "an unborn HEAD is not detached");
    }

    #[test]
    fn a_detached_head_reports_no_branch_and_says_so() {
        let fixture = Fixture::woven();
        let target = fixture.rev("HEAD~1");
        fixture.git(&["checkout", "-q", "--detach", &target]);

        let head = head(&fixture.open());

        assert!(head.detached);
        assert_eq!(head.branch, None);
        assert_eq!(head.id.as_deref(), Some(target.as_str()));
    }

    #[test]
    fn a_summary_describes_a_repository_without_opening_it_as_the_current_one() {
        let fixture = Fixture::dirty();
        let card = summary(fixture.path());

        assert!(card.present);
        assert!(!card.bare);
        assert_eq!(card.branch.as_deref(), Some("main"));
        assert!(!card.detached);
        assert_eq!(card.short.as_deref(), Some(&fixture.head()[..7]));
        assert_eq!(card.summary.as_deref(), Some("Merge feature/split-view"));
        assert!(card.time.is_some_and(|t| t > 0));
        assert_eq!(
            card.dirty,
            Some(fixture.git(&["status", "--porcelain"]).lines().count())
        );
        assert_eq!(card.stashes, Some(1));
        assert_eq!(card.branches, Some(3));
    }

    #[test]
    fn a_path_that_is_gone_is_a_card_that_says_so_rather_than_a_failure() {
        // The list is the user's own record of where their work is. A path that
        // has moved is something they should see, not something the list
        // quietly forgets.
        let missing = std::path::Path::new("/nowhere/at/all/my-project");
        let card = summary(missing);

        assert!(!card.present);
        assert_eq!(card.name, "my-project");
        assert_eq!(card.path, missing);
        assert_eq!(card.branch, None);
        assert_eq!(card.dirty, None);
    }

    #[test]
    fn a_directory_that_is_not_a_repository_is_also_reported_as_missing() {
        let dir = tempfile::tempdir().expect("temp dir");
        assert!(!summary(dir.path()).present);
    }

    #[test]
    fn a_summary_reads_a_detached_head_the_same_way_the_title_bar_does() {
        let fixture = Fixture::woven();
        fixture.git(&["checkout", "-q", "--detach", "HEAD~1"]);

        let card = summary(fixture.path());

        assert!(card.detached);
        assert_eq!(card.branch, None);
        assert!(card.short.is_some());
    }

    #[test]
    fn a_summary_of_a_repository_with_no_commits_still_names_it() {
        let fixture = Fixture::empty();
        let card = summary(fixture.path());

        assert!(card.present);
        assert_eq!(card.branch.as_deref(), Some("main"));
        assert_eq!(card.short, None);
        assert_eq!(card.summary, None);
        assert_eq!(card.branches, Some(0));
    }

    #[test]
    fn a_summary_never_writes_to_the_repository_it_reads() {
        // The All repositories screen reads repositories the user is not
        // working in. Leaving a rewritten index or a lock behind in someone
        // else's checkout is not something a list of cards may do.
        //
        // Nothing may run between the two readings: `git status` itself
        // rewrites the index to cache stat information.
        let fixture = Fixture::dirty();
        let index = fixture.path().join(".git/index");
        let before = std::fs::metadata(&index)
            .and_then(|m| m.modified())
            .expect("index mtime");

        let card = summary(fixture.path());

        let after = std::fs::metadata(&index)
            .and_then(|m| m.modified())
            .expect("index mtime");
        assert_eq!(before, after, "reading a card must not rewrite the index");
        assert!(
            !index.with_extension("lock").exists(),
            "no lock left behind"
        );
        assert!(card.present);
    }

    #[test]
    fn a_sync_handle_reopens_as_the_same_repository() {
        let fixture = Fixture::woven();
        let sync = open_sync(fixture.path()).expect("sync handle");
        let local = sync.to_thread_local();

        assert_eq!(head(&local).id, head(&fixture.open()).id);
    }
}
