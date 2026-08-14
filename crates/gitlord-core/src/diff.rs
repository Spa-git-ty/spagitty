// SPDX-License-Identifier: GPL-3.0-or-later

//! What a commit changed.
//!
//! Three levels, because they cost different amounts:
//!
//! - [`commit_detail`] — message, people, parents, and the list of paths. This
//!   is what fills the 270px detail panel on the Graph screen. No blob is read.
//! - [`commit_diff`] — the same list plus `+n −m` per file, which means reading
//!   and line-diffing every changed blob. The Diff screen needs it for its file
//!   list and its header count.
//! - [`file_diff`] — the hunks of a single file, fetched as that file is
//!   opened. A 400-file commit therefore does not build 400 files' worth of
//!   hunks to show the first one.

use gix::diff::blob;
use gix::ObjectId;
use serde::Serialize;

use crate::error::{Error, Result};
use crate::graph::short_id;

/// Context lines kept either side of a change. Three is git's default, and the
/// number people are used to reading.
const CONTEXT: u32 = 3;

/// Above this, a blob is reported as too large rather than diffed. Two copies
/// of the file plus the interner's line index all live in memory at once, so
/// the real cost of a diff is several times the file size; a repository with a
/// 200MB asset in it should not be able to freeze the window.
const MAX_BLOB_BYTES: usize = 8 * 1024 * 1024;

/// How far into a blob we look for a NUL byte before calling it text. This is
/// git's rule (`xdiff`'s `FIRST_FEW_BYTES`), so GitLord calls the same files
/// binary that `git diff` does.
const BINARY_SNIFF_BYTES: usize = 8000;

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

/// Where a line came from. `Context` lines appear in both versions.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum LineOrigin {
    Context,
    Added,
    Removed,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DiffLine {
    pub origin: LineOrigin,
    /// 1-based line number in the old version. `None` for an added line.
    pub old: Option<u32>,
    /// 1-based line number in the new version. `None` for a removed line.
    pub new: Option<u32>,
    /// The line's text, without its terminator.
    pub text: String,
}

/// One run of changes plus its surrounding context — a `@@` block.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Hunk {
    pub old_start: u32,
    pub old_lines: u32,
    pub new_start: u32,
    pub new_lines: u32,
    /// `@@ -12,7 +12,9 @@`, for the hunk header row.
    pub header: String,
    pub lines: Vec<DiffLine>,
}

/// One file's entry in the Diff screen's file list.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileChange {
    pub path: String,
    pub status: FileStatus,
    /// No line diff exists for this file: it is binary, or one side was over
    /// [`MAX_BLOB_BYTES`]. `added` and `removed` are 0 in both cases, which is
    /// the truth rather than a guess.
    pub binary: bool,
    pub too_large: bool,
    pub added: u32,
    pub removed: u32,
}

/// Everything the Diff screen's header and file list need.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitDiff {
    pub id: String,
    pub short: String,
    pub summary: String,
    pub files: Vec<FileChange>,
    /// Totals across every file, for the header's `+n −m`.
    pub added: u32,
    pub removed: u32,
}

/// One file's hunks, fetched when that file is opened.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileDiff {
    pub path: String,
    pub status: FileStatus,
    pub binary: bool,
    pub too_large: bool,
    pub added: u32,
    pub removed: u32,
    pub hunks: Vec<Hunk>,
}

/// Everything the detail panel shows for one commit.
///
/// The file list is the diff against the **first** parent. For a merge that is
/// the conventional view — the changes the merge brought onto the branch it
/// landed on — and it is what `git show` does by default.
pub fn commit_detail(repo: &gix::Repository, id: &str) -> Result<CommitDetail> {
    let commit = find_commit(repo, id)?;

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
    let files = tree_changes(repo, &commit, parents.first().copied())?
        .into_iter()
        .map(|change| ChangedFile {
            path: change.path,
            status: change.status,
        })
        .collect();

    Ok(CommitDetail {
        id: commit.id().to_string(),
        short: short_id(&commit.id().detach()),
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

/// The file list with per-file line counts.
///
/// Every changed blob is read and line-diffed here, because `+n −m` cannot be
/// known any other way. That is the price of the counts the design asks for,
/// and it is paid once when the screen opens rather than per keystroke.
pub fn commit_diff(repo: &gix::Repository, id: &str) -> Result<CommitDiff> {
    let commit = find_commit(repo, id)?;
    let summary = commit
        .message()
        .map_err(|e| Error::Diff(e.to_string()))?
        .summary()
        .to_string();

    let parent = commit.parent_ids().next().map(|id| id.detach());
    let changes = tree_changes(repo, &commit, parent)?;

    let mut files = Vec::with_capacity(changes.len());
    let mut added = 0;
    let mut removed = 0;

    for change in changes {
        let old = blob_bytes(repo, change.old)?;
        let new = blob_bytes(repo, change.new)?;
        let stats = line_stats(old.as_deref(), new.as_deref());

        added += stats.added;
        removed += stats.removed;

        files.push(FileChange {
            path: change.path,
            status: change.status,
            binary: stats.binary,
            too_large: stats.too_large,
            added: stats.added,
            removed: stats.removed,
        });
    }

    Ok(CommitDiff {
        id: commit.id().to_string(),
        short: short_id(&commit.id().detach()),
        summary,
        files,
        added,
        removed,
    })
}

/// The hunks for one path in one commit, against its first parent.
///
/// The path is looked up directly in both trees rather than by walking the
/// whole diff again: opening the twentieth file of a commit should not cost
/// what opening the whole commit did.
pub fn file_diff(repo: &gix::Repository, id: &str, path: &str) -> Result<FileDiff> {
    let commit = find_commit(repo, id)?;
    let parent = commit.parent_ids().next().map(|id| id.detach());

    let tree = commit.tree().map_err(|e| Error::Diff(e.to_string()))?;
    let new = blob_at(&tree, path)?;

    let old = match parent {
        Some(pid) => {
            let parent = repo
                .find_commit(pid)
                .map_err(|e| Error::Diff(e.to_string()))?;
            let parent_tree = parent.tree().map_err(|e| Error::Diff(e.to_string()))?;
            blob_at(&parent_tree, path)?
        }
        None => None,
    };

    let status = match (old, new) {
        (None, None) => return Err(Error::UnknownPath(path.to_string())),
        (None, Some(_)) => FileStatus::Added,
        (Some(_), None) => FileStatus::Deleted,
        (Some(_), Some(_)) => FileStatus::Modified,
    };

    let old = blob_bytes(repo, old)?;
    let new = blob_bytes(repo, new)?;
    let stats = line_stats(old.as_deref(), new.as_deref());

    let hunks = if stats.binary || stats.too_large {
        Vec::new()
    } else {
        hunks(
            old.as_deref().unwrap_or_default(),
            new.as_deref().unwrap_or_default(),
        )
    };

    Ok(FileDiff {
        path: path.to_string(),
        status,
        binary: stats.binary,
        too_large: stats.too_large,
        added: stats.added,
        removed: stats.removed,
        hunks,
    })
}

// --- Tree walking ---------------------------------------------------------

/// One changed path with both sides' blob ids, which is what a text diff needs
/// and what the public [`ChangedFile`] deliberately does not carry.
struct RawChange {
    path: String,
    status: FileStatus,
    /// `None` when the file did not exist on that side.
    old: Option<ObjectId>,
    new: Option<ObjectId>,
}

fn find_commit<'repo>(repo: &'repo gix::Repository, id: &str) -> Result<gix::Commit<'repo>> {
    let oid =
        ObjectId::from_hex(id.as_bytes()).map_err(|_| Error::UnknownCommit(id.to_string()))?;
    repo.find_commit(oid)
        .map_err(|_| Error::UnknownCommit(id.to_string()))
}

/// Tree diff of `commit` against `parent`, or against the empty tree for a root
/// commit — which is how a root commit correctly reads as "added everything".
fn tree_changes(
    repo: &gix::Repository,
    commit: &gix::Commit<'_>,
    parent: Option<ObjectId>,
) -> Result<Vec<RawChange>> {
    use gix::object::tree::diff::Change;

    let tree = commit.tree().map_err(|e| Error::Diff(e.to_string()))?;
    let parent_tree = match parent {
        Some(pid) => {
            let parent = repo
                .find_commit(pid)
                .map_err(|e| Error::Diff(e.to_string()))?;
            parent.tree().map_err(|e| Error::Diff(e.to_string()))?
        }
        None => repo.empty_tree(),
    };

    let mut changes: Vec<RawChange> = Vec::new();

    parent_tree
        .changes()
        .map_err(|e| Error::Diff(e.to_string()))?
        .for_each_to_obtain_tree(&tree, |change| {
            // A changed subtree is reported alongside the blobs inside it. Only
            // the blobs are files; a directory row in the file list would be a
            // row nothing can be done with.
            let mode = match &change {
                Change::Addition { entry_mode, .. }
                | Change::Deletion { entry_mode, .. }
                | Change::Modification { entry_mode, .. }
                | Change::Rewrite { entry_mode, .. } => *entry_mode,
            };
            if !mode.is_blob_or_symlink() {
                return Ok(std::ops::ControlFlow::Continue(()));
            }

            changes.push(match change {
                Change::Addition { location, id, .. } => RawChange {
                    path: location.to_string(),
                    status: FileStatus::Added,
                    old: None,
                    new: Some(id.detach()),
                },
                Change::Deletion { location, id, .. } => RawChange {
                    path: location.to_string(),
                    status: FileStatus::Deleted,
                    old: Some(id.detach()),
                    new: None,
                },
                Change::Modification {
                    location,
                    previous_id,
                    id,
                    ..
                } => RawChange {
                    path: location.to_string(),
                    status: FileStatus::Modified,
                    old: Some(previous_id.detach()),
                    new: Some(id.detach()),
                },
                Change::Rewrite {
                    location,
                    source_id,
                    id,
                    ..
                } => RawChange {
                    path: location.to_string(),
                    status: FileStatus::Renamed,
                    old: Some(source_id.detach()),
                    new: Some(id.detach()),
                },
            });
            Ok::<_, std::convert::Infallible>(std::ops::ControlFlow::Continue(()))
        })
        .map_err(|e| Error::Diff(e.to_string()))?;

    changes.sort_by(|a, b| a.path.cmp(&b.path));
    Ok(changes)
}

/// The blob id at `path`, or `None` when nothing is there. A directory or a
/// submodule at that path is also `None`: neither has a line diff.
fn blob_at(tree: &gix::Tree<'_>, path: &str) -> Result<Option<ObjectId>> {
    let entry = tree
        .lookup_entry_by_path(std::path::Path::new(path))
        .map_err(|e| Error::Diff(e.to_string()))?;

    Ok(entry
        .filter(|entry| entry.mode().is_blob_or_symlink())
        .map(|entry| entry.object_id()))
}

/// A missing side reads as empty, which is what makes an addition diff against
/// nothing rather than needing its own code path.
fn blob_bytes(repo: &gix::Repository, id: Option<ObjectId>) -> Result<Option<Vec<u8>>> {
    let Some(id) = id else { return Ok(None) };
    let object = repo
        .find_object(id)
        .map_err(|e| Error::Diff(e.to_string()))?;
    Ok(Some(object.detach().data))
}

// --- Text diff ------------------------------------------------------------

struct Stats {
    added: u32,
    removed: u32,
    binary: bool,
    too_large: bool,
}

/// Git's rule: a NUL byte near the start means binary.
fn is_binary(data: &[u8]) -> bool {
    data[..data.len().min(BINARY_SNIFF_BYTES)].contains(&0)
}

/// Line counts for one file, and the two reasons there may not be any.
fn line_stats(old: Option<&[u8]>, new: Option<&[u8]>) -> Stats {
    let old = old.unwrap_or_default();
    let new = new.unwrap_or_default();

    if is_binary(old) || is_binary(new) {
        return Stats {
            added: 0,
            removed: 0,
            binary: true,
            too_large: false,
        };
    }
    if old.len() > MAX_BLOB_BYTES || new.len() > MAX_BLOB_BYTES {
        return Stats {
            added: 0,
            removed: 0,
            binary: false,
            too_large: true,
        };
    }

    let input = blob::InternedInput::new(
        blob::sources::byte_lines(old),
        blob::sources::byte_lines(new),
    );
    let diff = blob::Diff::compute(blob::Algorithm::Histogram, &input);

    Stats {
        added: diff.count_additions(),
        removed: diff.count_removals(),
        binary: false,
        too_large: false,
    }
}

/// Group the raw changed ranges into `@@` blocks with context around them.
///
/// Two changes close enough that their context would overlap belong in one
/// hunk; that is what keeps a diff from splitting into a block per line.
fn hunks(old: &[u8], new: &[u8]) -> Vec<Hunk> {
    let input = blob::InternedInput::new(
        blob::sources::byte_lines(old),
        blob::sources::byte_lines(new),
    );
    let diff = blob::diff_with_slider_heuristics(blob::Algorithm::Histogram, &input);

    let old_total = input.before.len() as u32;
    let new_total = input.after.len() as u32;

    let mut groups: Vec<Vec<blob::Hunk>> = Vec::new();
    for change in diff.hunks() {
        match groups.last_mut() {
            Some(group)
                if change.before.start
                    <= group.last().expect("group is never empty").before.end + CONTEXT * 2 =>
            {
                group.push(change);
            }
            _ => groups.push(vec![change]),
        }
    }

    // The terminator is not part of the line. A CR is dropped with it, so a
    // CRLF file does not render a control character at the end of every row.
    // The diff itself is computed over the raw bytes, so a commit that only
    // changes line endings still shows its lines as changed — they just look
    // the same, which is the truth about what changed.
    let text = |token: blob::Token| {
        let line: &[u8] = input.interner[token];
        let line = line.strip_suffix(b"\n").unwrap_or(line);
        let line = line.strip_suffix(b"\r").unwrap_or(line);
        String::from_utf8_lossy(line).into_owned()
    };

    let mut out = Vec::with_capacity(groups.len());

    for group in groups {
        let first = group.first().expect("group is never empty");
        let last = group.last().expect("group is never empty");

        // Leading context exists in both versions, so the same number of lines
        // is taken off each side's start.
        let old_start = first.before.start.saturating_sub(CONTEXT);
        let lead = first.before.start - old_start;
        let new_start = first.after.start.saturating_sub(lead);

        let old_end = (last.before.end + CONTEXT).min(old_total);
        let trail = old_end - last.before.end;
        let new_end = (last.after.end + trail).min(new_total);

        let mut lines = Vec::new();
        let mut old_at = old_start;
        let mut new_at = new_start;

        for change in &group {
            while old_at < change.before.start {
                lines.push(DiffLine {
                    origin: LineOrigin::Context,
                    old: Some(old_at + 1),
                    new: Some(new_at + 1),
                    text: text(input.before[old_at as usize]),
                });
                old_at += 1;
                new_at += 1;
            }
            for index in change.before.clone() {
                lines.push(DiffLine {
                    origin: LineOrigin::Removed,
                    old: Some(index + 1),
                    new: None,
                    text: text(input.before[index as usize]),
                });
            }
            for index in change.after.clone() {
                lines.push(DiffLine {
                    origin: LineOrigin::Added,
                    old: None,
                    new: Some(index + 1),
                    text: text(input.after[index as usize]),
                });
            }
            old_at = change.before.end;
            new_at = change.after.end;
        }

        while old_at < old_end {
            lines.push(DiffLine {
                origin: LineOrigin::Context,
                old: Some(old_at + 1),
                new: Some(new_at + 1),
                text: text(input.before[old_at as usize]),
            });
            old_at += 1;
            new_at += 1;
        }

        let old_lines = old_end - old_start;
        let new_lines = new_end - new_start;
        out.push(Hunk {
            old_start: header_start(old_start, old_lines),
            old_lines,
            new_start: header_start(new_start, new_lines),
            new_lines,
            header: format!(
                "@@ -{},{} +{},{} @@",
                header_start(old_start, old_lines),
                old_lines,
                header_start(new_start, new_lines),
                new_lines
            ),
            lines,
        });
    }

    out
}

/// Hunk headers count from 1, except for an empty range, which git writes as
/// the line it would follow.
fn header_start(start: u32, lines: u32) -> u32 {
    if lines == 0 {
        start
    } else {
        start + 1
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn binary_sniffing_matches_gits_rule() {
        assert!(!is_binary(b"plain text\n"));
        assert!(is_binary(b"has a \0 byte"));
        // A NUL past the sniff window is not looked at, same as git.
        let mut late = vec![b'a'; BINARY_SNIFF_BYTES + 10];
        late[BINARY_SNIFF_BYTES + 5] = 0;
        assert!(!is_binary(&late));
    }

    #[test]
    fn empty_range_headers_use_gits_convention() {
        assert_eq!(header_start(0, 0), 0);
        assert_eq!(header_start(0, 3), 1);
        assert_eq!(header_start(11, 7), 12);
    }

    #[test]
    fn one_changed_line_gets_context_either_side() {
        let old = b"a\nb\nc\nd\ne\nf\ng\nh\n";
        let new = b"a\nb\nc\nD\ne\nf\ng\nh\n";

        let hunks = hunks(old, new);
        assert_eq!(hunks.len(), 1);

        let hunk = &hunks[0];
        assert_eq!(hunk.header, "@@ -1,7 +1,7 @@");
        assert_eq!(hunk.lines.len(), 8); // 3 context, -d, +D, 3 context

        assert_eq!(hunk.lines[3].origin, LineOrigin::Removed);
        assert_eq!(hunk.lines[3].text, "d");
        assert_eq!(hunk.lines[3].old, Some(4));
        assert_eq!(hunk.lines[3].new, None);

        assert_eq!(hunk.lines[4].origin, LineOrigin::Added);
        assert_eq!(hunk.lines[4].text, "D");
        assert_eq!(hunk.lines[4].old, None);
        assert_eq!(hunk.lines[4].new, Some(4));

        // Context after the change keeps counting on both sides.
        assert_eq!(hunk.lines[5].old, Some(5));
        assert_eq!(hunk.lines[5].new, Some(5));
    }

    #[test]
    fn distant_changes_split_into_separate_hunks() {
        let old: String = (0..40).map(|n| format!("line {n}\n")).collect();
        // Two changes far enough apart that their context cannot meet.
        let new = old
            .replace("line 1\n", "LINE 1\n")
            .replace("line 38\n", "LINE 38\n");

        let hunks = hunks(old.as_bytes(), new.as_bytes());
        assert_eq!(hunks.len(), 2);
        assert!(hunks[0].old_start < hunks[1].old_start);
    }

    #[test]
    fn an_addition_diffs_against_nothing() {
        let hunks = hunks(b"", b"one\ntwo\n");
        assert_eq!(hunks.len(), 1);
        assert_eq!(hunks[0].header, "@@ -0,0 +1,2 @@");
        assert!(hunks[0].lines.iter().all(|l| l.origin == LineOrigin::Added));
    }

    #[test]
    fn crlf_terminators_are_not_shown() {
        let hunks = hunks(b"a\r\n", b"b\r\n");
        assert_eq!(hunks[0].lines[0].text, "a");
        assert_eq!(hunks[0].lines[1].text, "b");
    }

    #[test]
    fn a_binary_side_reports_no_lines() {
        let stats = line_stats(Some(b"text\n"), Some(b"bin\0ary"));
        assert!(stats.binary);
        assert_eq!((stats.added, stats.removed), (0, 0));
    }
}
