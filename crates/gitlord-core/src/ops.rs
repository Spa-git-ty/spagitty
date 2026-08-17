// SPDX-License-Identifier: GPL-3.0-or-later

//! History operations the graph offers: reset, revert, cherry-pick, merge,
//! rebase, tags, and detaching HEAD.
//!
//! Every function here is a thin, *named* wrapper over [`crate::shell`]. The
//! naming is the point: `git reset --hard` is one command with three very
//! different meanings depending on a flag, and the graph's menu spells out
//! which one it is about to do. Turning that choice into a Rust enum means the
//! webview can never send a string that resolves to a harder reset than the one
//! the user read.
//!
//! # What is checked here, and what is not
//!
//! Nothing here validates a ref name, a revision or whether an operation makes
//! sense — `git` already knows all of it, its refusals name the actual problem,
//! and a second implementation of those rules could only disagree with the
//! first. What *is* checked here is the small set of things git will happily do
//! and the user did not ask for:
//!
//! - Deleting the branch that is checked out. Git refuses this one itself, but
//!   the message is about HEAD rather than about the branch, so it is caught
//!   here where the better sentence can be written.
//! - Reverting a merge without saying which side is the mainline. Git refuses;
//!   the graph always means the first parent, so that is supplied.
//!
//! # Confirmation is the caller's job
//!
//! `reset --hard` discards uncommitted work and `delete_branch(force)` discards
//! commits. Neither asks. The Settings screen's `confirmHistoryRewrite` toggle
//! and the graph's confirmation dialogs are where the question gets asked, and
//! they are deliberately *above* this layer: a core that prompted would be a
//! core that could not be scripted or tested.

use crate::error::{Error, Result};
use crate::repo::workdir;
use crate::shell;

pub use crate::shell::ResetMode;

/// Move the current branch to `commit`, taking the index and working tree with
/// it according to `mode`.
pub fn reset(repo: &gix::Repository, commit: &str, mode: ResetMode) -> Result<()> {
    shell::reset(workdir(repo)?, commit, mode)
}

/// Commit the inverse of `commit`.
pub fn revert(repo: &gix::Repository, commit: &str) -> Result<()> {
    let is_merge = parent_count(repo, commit)? > 1;
    shell::revert(workdir(repo)?, commit, is_merge)
}

/// Replay `commits` onto the current branch.
///
/// The order is the caller's, and it is the order they will be applied in. The
/// graph hands them over oldest-first, because that is the order they were
/// written in and the order in which they are most likely to apply cleanly.
pub fn cherry_pick(repo: &gix::Repository, commits: &[String]) -> Result<()> {
    shell::cherry_pick(workdir(repo)?, commits)
}

/// What a drag of one branch onto another can turn into.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Integration {
    /// Merge, letting git fast-forward when it can.
    Merge,
    /// Merge, always writing a merge commit.
    MergeNoFastForward,
    /// Move the pointer, or refuse. Never writes a commit.
    FastForward,
    /// Replay the current branch's commits on top of the other one.
    Rebase,
}

/// Integrate `source` into the branch that is checked out.
pub fn integrate(repo: &gix::Repository, source: &str, how: Integration) -> Result<()> {
    let workdir = workdir(repo)?;
    match how {
        Integration::Merge => shell::merge(workdir, source, false, false),
        Integration::MergeNoFastForward => shell::merge(workdir, source, false, true),
        Integration::FastForward => shell::merge(workdir, source, true, false),
        // `rebase <source>` replays HEAD's commits onto source, which is what
        // dragging the current branch onto another one means.
        Integration::Rebase => shell::rebase(workdir, "", source, ""),
    }
}

/// Replay `branch` — or HEAD when it is empty — onto `onto`.
///
/// `upstream` bounds what moves. When it is empty the whole branch moves, which
/// is the plain "rebase this onto that". When it is a commit, only what is
/// *after* it moves, which is the graph's "rebase these N commits onto".
pub fn rebase_onto(
    repo: &gix::Repository,
    onto: &str,
    upstream: &str,
    branch: &str,
) -> Result<()> {
    let workdir = workdir(repo)?;
    if upstream.is_empty() {
        shell::rebase(workdir, "", onto, branch)
    } else {
        shell::rebase(workdir, onto, upstream, branch)
    }
}

/// Run a planned interactive rebase. `todo` is a `git-rebase-todo` file.
pub fn rebase_interactive(repo: &gix::Repository, upstream: &str, todo: &str) -> Result<()> {
    shell::rebase_interactive(workdir(repo)?, upstream, todo)
}

/// Check out a commit with no branch attached.
pub fn checkout_detached(repo: &gix::Repository, revision: &str) -> Result<()> {
    shell::checkout_detached(workdir(repo)?, revision)
}

/// Rename a local branch.
pub fn rename_branch(repo: &gix::Repository, from: &str, to: &str) -> Result<()> {
    shell::rename_branch(workdir(repo)?, from, to)
}

/// Delete a local branch.
///
/// Refused for the branch that is checked out, with a sentence about the branch
/// rather than git's own, which talks about HEAD and leaves people wondering
/// what HEAD has to do with it.
pub fn delete_branch(repo: &gix::Repository, name: &str, force: bool) -> Result<()> {
    if crate::repo::head(repo).branch.as_deref() == Some(name) {
        return Err(Error::NotStageable(format!(
            "{name} is checked out; switch to another branch first"
        )));
    }
    shell::delete_branch(workdir(repo)?, name, force)
}

/// Create a tag at `target`, annotated when `message` is not empty.
pub fn create_tag(
    repo: &gix::Repository,
    name: &str,
    target: &str,
    message: &str,
) -> Result<()> {
    shell::create_tag(workdir(repo)?, name, target, message)
}

/// Delete a local tag.
pub fn delete_tag(repo: &gix::Repository, name: &str) -> Result<()> {
    shell::delete_tag(workdir(repo)?, name)
}

/// What to do with a stash entry.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub enum StashAction {
    /// Restore it and keep the entry.
    Apply,
    /// Restore it and remove the entry.
    Pop,
    /// Remove the entry without restoring it.
    Drop,
}

pub fn stash(repo: &gix::Repository, index: usize, action: StashAction) -> Result<()> {
    let workdir = workdir(repo)?;
    match action {
        StashAction::Apply => shell::stash_apply(workdir, index),
        StashAction::Pop => shell::stash_pop(workdir, index),
        StashAction::Drop => shell::stash_drop(workdir, index),
    }
}

/// Fetch, pruning refs the remote no longer has.
pub fn fetch(repo: &gix::Repository, remote: &str) -> Result<String> {
    shell::fetch(workdir(repo)?, remote)
}

/// Push, with `--force-with-lease` when `force` is set.
pub fn push(repo: &gix::Repository, remote: &str, refspec: &str, force: bool) -> Result<String> {
    shell::push(workdir(repo)?, remote, refspec, force)
}

/// How many parents a commit has. Two or more means it is a merge.
fn parent_count(repo: &gix::Repository, revision: &str) -> Result<usize> {
    let id = repo
        .rev_parse_single(revision)
        .map_err(|_| Error::UnknownCommit(revision.to_string()))?;
    let commit = id
        .object()
        .map_err(|e| Error::Walk(e.to_string()))?
        .try_into_commit()
        .map_err(|_| Error::UnknownCommit(revision.to_string()))?;

    Ok(commit.parent_ids().count())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fixture::Fixture;

    #[test]
    fn a_soft_reset_moves_the_branch_and_leaves_the_changes_staged() {
        let fixture = Fixture::woven();
        let repo = fixture.open();
        let before = crate::repo::head(&repo).id.expect("a head");

        reset(&repo, "HEAD~1", ResetMode::Soft).expect("the reset");

        let after = crate::repo::head(&repo).id.expect("a head");
        assert_ne!(after, before, "the branch moved");
        let working = crate::status::working_copy(&repo).expect("status");
        assert!(
            !working.staged.is_empty(),
            "a soft reset leaves the difference staged"
        );
    }

    #[test]
    fn a_mixed_reset_leaves_the_changes_unstaged_rather_than_staged() {
        let fixture = Fixture::woven();
        let repo = fixture.open();

        reset(&repo, "HEAD~1", ResetMode::Mixed).expect("the reset");

        let working = crate::status::working_copy(&repo).expect("status");
        assert!(working.staged.is_empty(), "nothing is staged");
        assert!(
            !working.unstaged.is_empty(),
            "the difference is in the working tree"
        );
    }

    #[test]
    fn deleting_the_checked_out_branch_is_refused_by_name() {
        let fixture = Fixture::woven();
        let repo = fixture.open();
        let current = crate::repo::head(&repo).branch.expect("a branch");

        let error = delete_branch(&repo, &current, false).unwrap_err();

        let message = error.to_string();
        assert!(
            message.contains(&current),
            "the refusal names the branch: {message}"
        );
        assert!(
            !message.contains("HEAD"),
            "and does not make the user think about HEAD: {message}"
        );
    }

    #[test]
    fn a_tag_created_here_is_the_tag_git_reports() {
        let fixture = Fixture::woven();
        let repo = fixture.open();

        create_tag(&repo, "v9.9.9", "HEAD", "").expect("the tag");

        let tags = fixture.git(&["tag", "--list"]);
        assert!(tags.contains("v9.9.9"), "git lists it: {tags}");
    }

    #[test]
    fn an_annotated_tag_carries_its_message() {
        let fixture = Fixture::woven();
        let repo = fixture.open();

        create_tag(&repo, "v1.0.0", "HEAD", "the first one").expect("the tag");

        let shown = fixture.git(&["tag", "-n", "v1.0.0"]);
        assert!(shown.contains("the first one"), "message kept: {shown}");
    }

    #[test]
    fn reverting_a_commit_adds_a_commit_rather_than_removing_one() {
        let fixture = Fixture::woven();
        let repo = fixture.open();
        let before = fixture.git(&["rev-list", "--count", "HEAD"]);

        revert(&repo, "HEAD").expect("the revert");

        let after = fixture.git(&["rev-list", "--count", "HEAD"]);
        let before: usize = before.trim().parse().expect("a count");
        let after: usize = after.trim().parse().expect("a count");
        assert_eq!(after, before + 1, "history grew by the revert commit");
    }

    #[test]
    fn a_detached_checkout_leaves_head_on_no_branch() {
        let fixture = Fixture::woven();
        let repo = fixture.open();

        checkout_detached(&repo, "HEAD~1").expect("the checkout");

        let head = crate::repo::head(&fixture.open());
        assert!(head.detached, "HEAD is detached");
        assert!(head.branch.is_none(), "and names no branch");
    }
}
