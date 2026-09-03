// SPDX-License-Identifier: GPL-3.0-or-later

//! Tidying up after a farm.
//!
//! Cleanup is separate from [`super::worktree::remove`] because it answers a
//! different question. `remove` is told which task to clean; this is told
//! nothing and has to work out what is left over — after a crash, after a farm
//! was deleted, after somebody removed a worktree directory by hand.
//!
//! The rule throughout: **remove what the farm made and can prove is finished,
//! and leave everything else alone.** A worktree with uncommitted changes, a
//! branch that is not merged, a directory that is not ours — all survive. The
//! cost of leaving something behind is a stale directory the user can delete;
//! the cost of removing the wrong thing is somebody's work.

use std::path::Path;

use spagitty_core::shell;
use spagitty_core::worktrees::Worktree;

use crate::error::Result;
use crate::model::TaskId;
use crate::workspace::branch::{is_farm_branch, task_of};

/// A worktree the farm made, and what is known about it.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Stale {
    pub task: TaskId,
    pub path: String,
    pub branch: String,
    /// The worktree's directory is gone but git still lists it. `git worktree
    /// prune` is the fix, and it is safe because there is nothing there.
    pub orphaned: bool,
}

/// Every farm worktree in the repository, whether or not a farm knows about it.
///
/// This is what recovery reads at startup. A worktree on a farm branch whose
/// task is not in any saved farm is exactly the leftover this exists to find.
pub fn farm_worktrees(repo: &Path) -> Vec<Stale> {
    let listed = shell::worktree_list(repo).unwrap_or_default();
    spagitty_core::worktrees::parse_worktree_porcelain(&listed)
        .into_iter()
        .filter_map(as_stale)
        .collect()
}

fn as_stale(worktree: Worktree) -> Option<Stale> {
    let branch = worktree.branch.clone()?;
    if !is_farm_branch(&branch) {
        return None;
    }
    Some(Stale {
        task: task_of(&branch)?,
        path: worktree.path.clone(),
        branch,
        orphaned: worktree.prunable_reason.is_some(),
    })
}

/// Remove the worktrees for tasks no farm claims any more.
///
/// `known` is every task identifier the saved farms still hold. Anything on a
/// farm branch outside that set is a leftover.
///
/// Returns what it removed, so the caller can say so rather than tidying up
/// silently — a tool that deletes directories without mentioning it is a tool
/// people stop pointing at their repositories.
pub fn sweep(repo: &Path, known: &[TaskId]) -> Result<Vec<Stale>> {
    let mut removed = Vec::new();
    for stale in farm_worktrees(repo) {
        if known.contains(&stale.task) {
            continue;
        }
        // Never forced: a leftover with uncommitted changes stays, and stays
        // visible in the Worktrees screen where the user can decide.
        let path = Path::new(&stale.path);
        if shell::worktree_remove(repo, path, false).is_ok() {
            let _ = shell::delete_branch(repo, &stale.branch, false);
            removed.push(stale);
        }
    }
    // Worktrees whose directory a user deleted by hand leave an administrative
    // record behind. Pruning them is safe by definition — there is nothing on
    // disk to lose — and without it they are listed forever.
    let _ = shell::worktree_prune(repo);
    Ok(removed)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::model::AgentProvider;
    use crate::workspace::worktree;
    use spagitty_core::fixture::Fixture;

    #[test]
    fn only_farm_worktrees_are_listed() {
        let repo = Fixture::woven();
        worktree::create(
            repo.path(),
            &TaskId::new("TASK-0001"),
            AgentProvider::ClaudeCode,
            "HEAD",
        )
        .unwrap();
        // A worktree the user made, on a branch of their own. In a temporary
        // directory of its own rather than beside the repository: tests run in
        // parallel, and a shared path under /tmp collides with a sibling.
        let elsewhere = tempfile::tempdir().unwrap();
        let theirs = elsewhere.path().join("mine");
        shell::worktree_add(repo.path(), &theirs, None, Some("my-work"), false).unwrap();

        let found = farm_worktrees(repo.path());
        assert_eq!(found.len(), 1, "{found:?}");
        assert_eq!(found[0].task, TaskId::new("TASK-0001"));
    }

    #[test]
    fn a_worktree_no_farm_claims_is_swept() {
        let repo = Fixture::woven();
        let workspace = worktree::create(
            repo.path(),
            &TaskId::new("TASK-0001"),
            AgentProvider::ClaudeCode,
            "HEAD",
        )
        .unwrap();

        let removed = sweep(repo.path(), &[]).unwrap();
        assert_eq!(removed.len(), 1);
        assert!(!workspace.path.exists());
    }

    #[test]
    fn a_worktree_a_farm_still_claims_is_left_alone() {
        let repo = Fixture::woven();
        let task = TaskId::new("TASK-0001");
        let workspace =
            worktree::create(repo.path(), &task, AgentProvider::ClaudeCode, "HEAD").unwrap();

        let removed = sweep(repo.path(), &[task]).unwrap();
        assert!(removed.is_empty());
        assert!(workspace.path.exists());
    }

    #[test]
    fn a_leftover_with_uncommitted_work_survives_the_sweep() {
        let repo = Fixture::woven();
        let workspace = worktree::create(
            repo.path(),
            &TaskId::new("TASK-0001"),
            AgentProvider::ClaudeCode,
            "HEAD",
        )
        .unwrap();
        std::fs::write(workspace.path.join("unfinished.txt"), "half a change").unwrap();

        let removed = sweep(repo.path(), &[]).unwrap();
        assert!(removed.is_empty(), "work was thrown away: {removed:?}");
        assert!(workspace.path.join("unfinished.txt").exists());
    }

    #[test]
    fn a_repository_with_no_farm_sweeps_to_nothing() {
        let repo = Fixture::woven();
        assert!(farm_worktrees(repo.path()).is_empty());
        assert!(sweep(repo.path(), &[]).unwrap().is_empty());
    }
}
