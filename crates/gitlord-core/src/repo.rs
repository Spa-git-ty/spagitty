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
    fn a_sync_handle_reopens_as_the_same_repository() {
        let fixture = Fixture::woven();
        let sync = open_sync(fixture.path()).expect("sync handle");
        let local = sync.to_thread_local();

        assert_eq!(head(&local).id, head(&fixture.open()).id);
    }
}
