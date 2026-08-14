// SPDX-License-Identifier: GPL-3.0-or-later

//! Commit detail: the message, signatures, parents, and the files a commit
//! touched. This is what fills the 270px detail panel on the Graph screen.

use gix::ObjectId;
use serde::Serialize;

use crate::error::{Error, Result};
use crate::graph::short_id;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum FileStatus {
    Added,
    Modified,
    Deleted,
    Renamed,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChangedFile {
    pub path: String,
    pub status: FileStatus,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitDetail {
    pub id: String,
    pub short: String,
    /// First line of the message.
    pub summary: String,
    /// Everything after the first line, trimmed. Often empty.
    pub body: String,
    pub author_name: String,
    pub author_email: String,
    pub author_time: i64,
    pub committer_name: String,
    pub committer_email: String,
    pub commit_time: i64,
    pub parents: Vec<String>,
    pub files: Vec<ChangedFile>,
}

/// Everything the detail panel shows for one commit.
///
/// The file list is the diff against the **first** parent. For a merge that is
/// the conventional view — the changes the merge brought onto the branch it
/// landed on — and it is what `git show` does by default.
pub fn commit_detail(repo: &gix::Repository, id: &str) -> Result<CommitDetail> {
    let oid = ObjectId::from_hex(id.as_bytes()).map_err(|_| Error::UnknownCommit(id.to_string()))?;
    let commit = repo
        .find_commit(oid)
        .map_err(|_| Error::UnknownCommit(id.to_string()))?;

    let message = commit.message().map_err(|e| Error::Diff(e.to_string()))?;
    let summary = message.summary().to_string();
    let body = message
        .body()
        .map(|b| b.to_string())
        .unwrap_or_default()
        .trim()
        .to_string();

    let author = commit.author().map_err(|e| Error::Diff(e.to_string()))?;
    let committer = commit.committer().map_err(|e| Error::Diff(e.to_string()))?;

    let parents: Vec<ObjectId> = commit.parent_ids().map(|id| id.detach()).collect();
    let files = changed_files(repo, &commit, parents.first().copied())?;

    Ok(CommitDetail {
        id: oid.to_string(),
        short: short_id(&oid),
        summary,
        body,
        author_name: author.name.to_string(),
        author_email: author.email.to_string(),
        author_time: author.time().map(|t| t.seconds).unwrap_or(0),
        committer_name: committer.name.to_string(),
        committer_email: committer.email.to_string(),
        commit_time: committer.time().map(|t| t.seconds).unwrap_or(0),
        parents: parents.iter().map(ObjectId::to_string).collect(),
        files,
    })
}

/// Tree diff of `commit` against `parent`, or against the empty tree for a root
/// commit — which is how a root commit correctly reads as "added everything".
fn changed_files(
    repo: &gix::Repository,
    commit: &gix::Commit<'_>,
    parent: Option<ObjectId>,
) -> Result<Vec<ChangedFile>> {
    use gix::object::tree::diff::Change;

    let tree = commit.tree().map_err(|e| Error::Diff(e.to_string()))?;
    let parent_tree = match parent {
        Some(pid) => {
            let parent = repo.find_commit(pid).map_err(|e| Error::Diff(e.to_string()))?;
            parent.tree().map_err(|e| Error::Diff(e.to_string()))?
        }
        None => repo.empty_tree(),
    };

    let mut files: Vec<ChangedFile> = Vec::new();

    parent_tree
        .changes()
        .map_err(|e| Error::Diff(e.to_string()))?
        .for_each_to_obtain_tree(&tree, |change| {
            let (path, status) = match change {
                Change::Addition { location, .. } => (location.to_string(), FileStatus::Added),
                Change::Deletion { location, .. } => (location.to_string(), FileStatus::Deleted),
                Change::Modification { location, .. } => {
                    (location.to_string(), FileStatus::Modified)
                }
                Change::Rewrite { location, .. } => (location.to_string(), FileStatus::Renamed),
            };
            files.push(ChangedFile { path, status });
            Ok::<_, std::convert::Infallible>(std::ops::ControlFlow::Continue(()))
        })
        .map_err(|e| Error::Diff(e.to_string()))?;

    files.sort_by(|a, b| a.path.cmp(&b.path));
    Ok(files)
}
