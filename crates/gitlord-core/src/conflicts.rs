// SPDX-License-Identifier: GPL-3.0-or-later

//! A repository stopped mid-operation.
//!
//! When git cannot merge two versions of a file it does not pick one. It writes
//! all three into the index — stage 1 the common ancestor, stage 2 ours, stage 3
//! theirs — and leaves the working-tree file with conflict markers in it. That
//! is the whole data model of this module: read those stages and say what each
//! side held.
//!
//! Nothing here writes. Reading is the entire first pass; taking a side, editing
//! the merged result and marking a file resolved are FEAT-016, and they are
//! deliberately absent rather than half-present.

use serde::Serialize;

use crate::error::{Error, Result};

/// How far into a blob we look for a NUL byte before calling it binary. Git's
/// own rule, and the same constant `diff.rs` uses, so both modules call the same
/// files binary that `git diff` does.
const BINARY_SNIFF_BYTES: usize = 8000;

/// Above this, a side is reported as too large rather than sent to the screen.
/// Three sides render at once here, so the ceiling matters more than it does on
/// the Diff screen.
const MAX_SIDE_BYTES: usize = 8 * 1024 * 1024;

/// What the repository is in the middle of.
///
/// Read from the repository's own state rather than inferred from the presence
/// of conflicts. Merge, rebase, cherry-pick and revert all leave conflicts
/// behind, and telling someone "merge" during a rebase sends them to the wrong
/// command to get out of it.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Operation {
    Merge,
    Rebase,
    RebaseInteractive,
    CherryPick,
    Revert,
    ApplyMailbox,
    Bisect,
    /// Nothing in progress. Conflicts can still exist — an unresolved index
    /// outlives the command that made it — and saying "none" is the honest
    /// answer rather than picking the likeliest operation.
    None,
}

impl Operation {
    /// What git calls this, for a screen that has to name the command the user
    /// will type to get out.
    pub fn label(self) -> &'static str {
        match self {
            Operation::Merge => "merge",
            Operation::Rebase => "rebase",
            Operation::RebaseInteractive => "interactive rebase",
            Operation::CherryPick => "cherry-pick",
            Operation::Revert => "revert",
            Operation::ApplyMailbox => "am",
            Operation::Bisect => "bisect",
            Operation::None => "none",
        }
    }
}

/// Which sides a conflicted path has, which is the same thing as what kind of
/// conflict it is.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum ConflictKind {
    /// Stages 1, 2 and 3: both sides changed a file that already existed.
    BothModified,
    /// Stages 2 and 3 with no base: both sides added the same path.
    BothAdded,
    /// No stage 2: our side deleted it, theirs changed it.
    DeletedByUs,
    /// No stage 3: their side deleted it, ours changed it.
    DeletedByThem,
}

impl ConflictKind {
    fn from_stages(base: bool, ours: bool, theirs: bool) -> Option<Self> {
        match (base, ours, theirs) {
            (_, true, true) if base => Some(ConflictKind::BothModified),
            (false, true, true) => Some(ConflictKind::BothAdded),
            (_, false, true) => Some(ConflictKind::DeletedByUs),
            (_, true, false) => Some(ConflictKind::DeletedByThem),
            _ => None,
        }
    }
}

/// One conflicted path, as the pager lists it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConflictFile {
    pub path: String,
    pub kind: ConflictKind,
}

/// One version of a conflicted file.
///
/// `None` where a side does not exist is the caller's business; this is what a
/// side that *does* exist holds.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConflictSide {
    /// Empty when `binary` or `too_large`, because there is nothing honest to
    /// put there.
    pub text: String,
    pub lines: usize,
    pub bytes: usize,
    pub binary: bool,
    pub too_large: bool,
}

/// The three index stages of one conflicted path, plus what is on disk.
///
/// A missing side is [`None`] rather than an empty [`ConflictSide`]: "the file
/// was deleted on that side" and "the file was emptied on that side" are
/// different things, and the second one loses work if acted on.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConflictSides {
    pub path: String,
    pub kind: ConflictKind,
    /// Stage 1 — the common ancestor. Absent when both sides added the path.
    pub base: Option<ConflictSide>,
    /// Stage 2 — ours, which is `HEAD`.
    pub ours: Option<ConflictSide>,
    /// Stage 3 — theirs, the incoming side.
    pub theirs: Option<ConflictSide>,
    /// The working-tree file, markers and all. Absent when there is no file on
    /// disk, which is what a delete/modify conflict looks like until it is
    /// resolved.
    pub merged: Option<ConflictSide>,
}

/// Everything the screen needs before a file is chosen.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConflictState {
    pub operation: Operation,
    pub files: Vec<ConflictFile>,
}

/// What the repository is in the middle of, from its own state.
pub fn operation(repo: &gix::Repository) -> Operation {
    use gix::state::InProgress;

    match repo.state() {
        Some(InProgress::Merge) => Operation::Merge,
        Some(InProgress::Rebase) => Operation::Rebase,
        Some(InProgress::RebaseInteractive) => Operation::RebaseInteractive,
        Some(InProgress::CherryPick | InProgress::CherryPickSequence) => Operation::CherryPick,
        Some(InProgress::Revert | InProgress::RevertSequence) => Operation::Revert,
        Some(InProgress::ApplyMailbox | InProgress::ApplyMailboxRebase) => Operation::ApplyMailbox,
        Some(InProgress::Bisect) => Operation::Bisect,
        None => Operation::None,
    }
}

/// Every conflicted path, sorted, with what kind of conflict each one is.
///
/// This is the index's own answer: entries at stages 1 to 3. A bare repository
/// has no index to read and reports nothing rather than failing, the same way
/// the rail's counts do.
pub fn conflicted(repo: &gix::Repository) -> Result<Vec<ConflictFile>> {
    let Some(index) = read_index(repo)? else {
        return Ok(Vec::new());
    };

    let mut files: Vec<ConflictFile> = Vec::new();
    for (path, stages) in group_by_path(&index) {
        if let Some(kind) = ConflictKind::from_stages(
            stages.base.is_some(),
            stages.ours.is_some(),
            stages.theirs.is_some(),
        ) {
            files.push(ConflictFile { path, kind });
        }
    }

    files.sort_by(|a, b| a.path.cmp(&b.path));
    Ok(files)
}

/// The state of the screen before a file is chosen: what is running, and what
/// is conflicted.
pub fn state(repo: &gix::Repository) -> Result<ConflictState> {
    Ok(ConflictState {
        operation: operation(repo),
        files: conflicted(repo)?,
    })
}

/// The three sides of one conflicted path, plus the file on disk.
///
/// A path that is not conflicted is an error rather than an empty result: the
/// screen only ever asks about paths it was given, so being asked about
/// anything else means the screen and the repository have drifted apart.
pub fn sides(repo: &gix::Repository, path: &str) -> Result<ConflictSides> {
    let index = read_index(repo)?.ok_or_else(|| Error::UnknownPath(path.to_string()))?;

    let stages = group_by_path(&index)
        .into_iter()
        .find(|(entry_path, _)| entry_path == path)
        .map(|(_, stages)| stages)
        .ok_or_else(|| Error::UnknownPath(path.to_string()))?;

    let kind = ConflictKind::from_stages(
        stages.base.is_some(),
        stages.ours.is_some(),
        stages.theirs.is_some(),
    )
    .ok_or_else(|| Error::UnknownPath(path.to_string()))?;

    Ok(ConflictSides {
        path: path.to_string(),
        kind,
        base: blob_side(repo, stages.base)?,
        ours: blob_side(repo, stages.ours)?,
        theirs: blob_side(repo, stages.theirs)?,
        merged: worktree_side(repo, path),
    })
}

// --- Reading the index ----------------------------------------------------

/// The three blob ids a conflicted path can have.
#[derive(Default)]
struct Stages {
    base: Option<gix::ObjectId>,
    ours: Option<gix::ObjectId>,
    theirs: Option<gix::ObjectId>,
}

/// The index, or `None` for a repository that has none — a bare one, or one
/// with no commits and nothing staged.
fn read_index(repo: &gix::Repository) -> Result<Option<gix::worktree::Index>> {
    match repo.index() {
        Ok(index) => Ok(Some(index)),
        // Not "the index is broken": a repository with nothing in it has no
        // index file at all, and that is not a conflicted repository.
        Err(_) => Ok(None),
    }
}

/// Conflicted entries grouped by path, in index order.
///
/// The index is sorted by path with stages ascending within a path, so entries
/// for one path are adjacent; this still groups by path rather than relying on
/// that, because the grouping is what the caller means and the adjacency is an
/// implementation detail of the format.
fn group_by_path(index: &gix::worktree::Index) -> Vec<(String, Stages)> {
    use gix::index::entry::Stage;

    let mut out: Vec<(String, Stages)> = Vec::new();

    for entry in index.entries() {
        let stage = entry.stage();
        if stage == Stage::Unconflicted {
            continue;
        }

        let path = entry.path(index).to_string();
        let slot = match out.iter_mut().find(|(existing, _)| *existing == path) {
            Some(slot) => slot,
            None => {
                out.push((path, Stages::default()));
                out.last_mut().expect("just pushed")
            }
        };

        match stage {
            Stage::Base => slot.1.base = Some(entry.id),
            Stage::Ours => slot.1.ours = Some(entry.id),
            Stage::Theirs => slot.1.theirs = Some(entry.id),
            Stage::Unconflicted => unreachable!("skipped above"),
        }
    }

    out
}

// --- Reading a side -------------------------------------------------------

fn blob_side(repo: &gix::Repository, id: Option<gix::ObjectId>) -> Result<Option<ConflictSide>> {
    let Some(id) = id else { return Ok(None) };
    let object = repo
        .find_object(id)
        .map_err(|e| Error::Diff(e.to_string()))?;

    Ok(Some(side_from(&object.detach().data)))
}

/// The working-tree file. Absent rather than an error when there is nothing on
/// disk: a delete/modify conflict leaves no file until it is resolved, and an
/// unreadable one is a side we cannot show rather than a failure of the screen.
fn worktree_side(repo: &gix::Repository, path: &str) -> Option<ConflictSide> {
    let workdir = repo.workdir()?;
    let bytes = std::fs::read(workdir.join(path)).ok()?;
    Some(side_from(&bytes))
}

fn side_from(data: &[u8]) -> ConflictSide {
    let bytes = data.len();

    if is_binary(data) {
        return ConflictSide {
            text: String::new(),
            lines: 0,
            bytes,
            binary: true,
            too_large: false,
        };
    }
    if bytes > MAX_SIDE_BYTES {
        return ConflictSide {
            text: String::new(),
            lines: 0,
            bytes,
            binary: false,
            too_large: true,
        };
    }

    let text = String::from_utf8_lossy(data).into_owned();
    ConflictSide {
        lines: line_count(&text),
        text,
        bytes,
        binary: false,
        too_large: false,
    }
}

/// Lines the way a file viewer counts them: a trailing newline ends the last
/// line rather than starting an empty one.
fn line_count(text: &str) -> usize {
    if text.is_empty() {
        return 0;
    }
    text.lines().count()
}

/// Git's rule: a NUL byte near the start means binary.
fn is_binary(data: &[u8]) -> bool {
    data[..data.len().min(BINARY_SNIFF_BYTES)].contains(&0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fixture::Fixture;
    use crate::status;

    #[test]
    fn the_conflicted_paths_match_what_git_reports() {
        let fixture = Fixture::conflicted();
        let repo = fixture.open();

        let ours: Vec<String> = conflicted(&repo)
            .expect("conflicts")
            .into_iter()
            .map(|file| file.path)
            .collect();

        let theirs: Vec<String> = fixture
            .git(&["diff", "--name-only", "--diff-filter=U"])
            .lines()
            .map(str::to_string)
            .collect();

        assert_eq!(ours, theirs);
    }

    #[test]
    fn the_status_walk_finds_the_same_paths_by_a_different_route() {
        // Two ways of finding the same thing is worth more than one way used
        // twice: this module reads the index, `status` walks the working copy.
        let fixture = Fixture::conflicted();
        let repo = fixture.open();

        let from_index: Vec<String> = conflicted(&repo)
            .expect("conflicts")
            .into_iter()
            .map(|file| file.path)
            .collect();
        let from_walk: Vec<String> = status::working_copy(&repo)
            .expect("status")
            .conflicted
            .into_iter()
            .map(|entry| entry.path)
            .collect();

        assert_eq!(from_index, from_walk);
    }

    #[test]
    fn each_side_is_what_git_show_reports_for_that_stage() {
        let fixture = Fixture::conflicted();
        let repo = fixture.open();

        let sides = sides(&repo, "shared.txt").expect("sides");

        for (side, stage) in [(&sides.base, "1"), (&sides.ours, "2"), (&sides.theirs, "3")] {
            let expected = fixture.git(&["show", &format!(":{stage}:shared.txt")]);
            assert_eq!(
                side.as_ref().expect("a side").text,
                expected,
                "stage {stage}"
            );
        }
    }

    #[test]
    fn the_merged_side_is_the_file_on_disk_with_its_markers() {
        let fixture = Fixture::conflicted();
        let repo = fixture.open();

        let merged = sides(&repo, "shared.txt")
            .expect("sides")
            .merged
            .expect("a file on disk");

        assert!(merged.text.contains("<<<<<<<"), "{}", merged.text);
        assert!(merged.text.contains(">>>>>>>"), "{}", merged.text);
        assert_eq!(
            merged.text,
            std::fs::read_to_string(fixture.path().join("shared.txt")).expect("the file")
        );
    }

    #[test]
    fn a_file_added_on_both_sides_has_no_base_and_says_so() {
        let fixture = Fixture::added_on_both_sides();
        let repo = fixture.open();

        let file = &conflicted(&repo).expect("conflicts")[0];
        assert_eq!(file.kind, ConflictKind::BothAdded);

        let sides = sides(&repo, "both.txt").expect("sides");
        assert!(sides.base.is_none(), "there is no common ancestor");
        assert!(sides.ours.is_some());
        assert!(sides.theirs.is_some());
    }

    #[test]
    fn a_delete_modify_conflict_names_the_side_that_deleted_it() {
        // An empty pane would read as "they emptied the file", which is a
        // different thing and one that loses work if acted on.
        let fixture = Fixture::deleted_on_one_side();
        let repo = fixture.open();

        let file = conflicted(&repo)
            .expect("conflicts")
            .into_iter()
            .find(|file| file.path == "gone.txt")
            .expect("the deleted path");

        assert_eq!(file.kind, ConflictKind::DeletedByThem);

        let sides = sides(&repo, "gone.txt").expect("sides");
        assert!(sides.base.is_some(), "it existed before");
        assert!(sides.ours.is_some(), "we still have it");
        assert!(sides.theirs.is_none(), "they deleted it");
    }

    #[test]
    fn a_binary_side_is_named_rather_than_decoded() {
        let fixture = Fixture::binary_conflict();
        let repo = fixture.open();

        let sides = sides(&repo, "logo.bin").expect("sides");
        let ours = sides.ours.expect("our side");

        assert!(ours.binary);
        assert!(ours.text.is_empty(), "nothing honest to put there");
        assert!(ours.bytes > 0, "the size is still known");
    }

    #[test]
    fn a_clean_repository_has_no_conflicts_and_no_operation() {
        let fixture = Fixture::woven();
        let repo = fixture.open();

        assert!(conflicted(&repo).expect("conflicts").is_empty());
        assert_eq!(operation(&repo), Operation::None);
    }

    #[test]
    fn the_operation_is_read_from_the_repository_rather_than_guessed() {
        // Merge, rebase, cherry-pick and revert all leave conflicts behind.
        // Naming the wrong one sends the user to the wrong command to get out.
        assert_eq!(operation(&Fixture::conflicted().open()), Operation::Merge);
        assert_eq!(
            operation(&Fixture::cherry_pick_conflict().open()),
            Operation::CherryPick
        );
    }

    #[test]
    fn asking_about_a_path_that_is_not_conflicted_is_an_error() {
        let fixture = Fixture::conflicted();
        let repo = fixture.open();

        assert!(sides(&repo, "untouched.txt").is_err());
        assert!(sides(&repo, "no/such/file.txt").is_err());
    }

    #[test]
    fn an_empty_repository_has_no_conflicts_rather_than_a_failure() {
        let fixture = Fixture::empty();
        let repo = fixture.open();

        assert!(conflicted(&repo).expect("conflicts").is_empty());
        assert_eq!(operation(&repo), Operation::None);
    }

    #[test]
    fn reading_every_side_never_writes_to_the_repository() {
        // Both readings are taken with nothing in between, because a status
        // walk rewrites the index to cache stat information — that is what
        // failed the first version of the same test on `repo::summary`.
        let fixture = Fixture::conflicted();
        let repo = fixture.open();
        let index_path = fixture.path().join(".git/index");

        let mtime = || {
            std::fs::metadata(&index_path)
                .expect("index")
                .modified()
                .expect("a modification time")
        };

        let before = mtime();
        for file in conflicted(&repo).expect("conflicts") {
            sides(&repo, &file.path).expect("sides");
        }
        let after = mtime();

        assert_eq!(before, after, "the index was rewritten");
        assert!(
            !fixture.path().join(".git/index.lock").exists(),
            "a lock was left behind"
        );
    }

    #[test]
    fn the_state_carries_the_operation_and_the_files_together() {
        let state = state(&Fixture::conflicted().open()).expect("state");

        assert_eq!(state.operation, Operation::Merge);
        assert_eq!(state.files.len(), 1);
    }

    #[test]
    fn an_operation_names_itself_the_way_git_does() {
        assert_eq!(Operation::Merge.label(), "merge");
        assert_eq!(Operation::RebaseInteractive.label(), "interactive rebase");
        assert_eq!(Operation::None.label(), "none");
    }

    #[test]
    fn a_line_count_treats_a_trailing_newline_as_ending_the_last_line() {
        assert_eq!(line_count(""), 0);
        assert_eq!(line_count("one\n"), 1);
        assert_eq!(line_count("one\ntwo"), 2);
        assert_eq!(line_count("one\ntwo\n"), 2);
    }

    #[test]
    fn a_nul_byte_after_the_sniff_window_is_still_text() {
        // Git's rule, so GitLord calls the same files binary that git does.
        let mut late = vec![b'a'; BINARY_SNIFF_BYTES + 10];
        late[BINARY_SNIFF_BYTES + 5] = 0;

        assert!(!is_binary(&late));
        assert!(is_binary(b"\0start"));
    }

    #[test]
    fn a_side_over_the_ceiling_is_reported_rather_than_sent_to_the_screen() {
        let huge = vec![b'a'; MAX_SIDE_BYTES + 1];
        let side = side_from(&huge);

        assert!(side.too_large);
        assert!(side.text.is_empty());
        assert_eq!(side.bytes, MAX_SIDE_BYTES + 1);
    }

    #[test]
    fn stages_map_to_the_kind_of_conflict_they_describe() {
        use ConflictKind::*;

        assert_eq!(
            ConflictKind::from_stages(true, true, true),
            Some(BothModified)
        );
        assert_eq!(
            ConflictKind::from_stages(false, true, true),
            Some(BothAdded)
        );
        assert_eq!(
            ConflictKind::from_stages(true, false, true),
            Some(DeletedByUs)
        );
        assert_eq!(
            ConflictKind::from_stages(true, true, false),
            Some(DeletedByThem)
        );
        assert_eq!(
            ConflictKind::from_stages(true, false, false),
            None,
            "a path with only a base is not a conflict anyone can act on"
        );
    }
}
