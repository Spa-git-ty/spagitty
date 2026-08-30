// SPDX-License-Identifier: GPL-3.0-or-later

//! Git worktrees management (FEAT-062).
//!
//! Exposes listing, creating, removing, locking, unlocking, and pruning linked
//! working trees. Worktree reading parses git's `--porcelain` output stream,
//! ensuring robust parsing across git versions and operating systems.

use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::error::{Error, Result};
use crate::repo::workdir;
use crate::shell;

/// One working tree attached to a git repository.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Worktree {
    /// Absolute filesystem path to the working tree.
    pub path: String,
    /// Display name (trailing directory component).
    pub name: String,
    /// HEAD commit object ID (full hex SHA).
    pub head: String,
    /// Short 7-character commit hash for display.
    pub head_short: String,
    /// Short branch name if on a branch (e.g. `feature-xyz`), or None if detached.
    pub branch: Option<String>,
    /// True if this is the main / root repository working tree.
    pub is_main: bool,
    /// True if the working tree is bare.
    pub is_bare: bool,
    /// True if HEAD is detached (not on any named branch).
    pub is_detached: bool,
    /// Optional lock reason if locked against pruning.
    pub locked_reason: Option<String>,
    /// Optional prunable reason if the worktree gitdir is orphaned or missing.
    pub prunable_reason: Option<String>,
}

/// Parse `git worktree list --porcelain` output into a list of [`Worktree`].
pub fn parse_worktree_porcelain(raw: &str) -> Vec<Worktree> {
    let mut worktrees = Vec::new();
    let mut current_path: Option<String> = None;
    let mut current_head = String::new();
    let mut current_branch: Option<String> = None;
    let mut is_bare = false;
    let mut is_detached = false;
    let mut locked_reason: Option<String> = None;
    let mut prunable_reason: Option<String> = None;

    let finish_entry = |worktrees: &mut Vec<Worktree>,
                        path: Option<String>,
                        head: String,
                        branch: Option<String>,
                        bare: bool,
                        detached: bool,
                        locked: Option<String>,
                        prunable: Option<String>| {
        if let Some(p) = path {
            let name = Path::new(&p)
                .file_name()
                .map(|f| f.to_string_lossy().into_owned())
                .unwrap_or_else(|| p.clone());
            let head_short = if head.len() >= 7 {
                head[..7].to_string()
            } else {
                head.clone()
            };
            let is_main = worktrees.is_empty();
            worktrees.push(Worktree {
                path: p,
                name,
                head,
                head_short,
                branch,
                is_main,
                is_bare: bare,
                is_detached: detached,
                locked_reason: locked,
                prunable_reason: prunable,
            });
        }
    };

    for line in raw.lines() {
        let line = line.trim();
        if line.is_empty() {
            finish_entry(
                &mut worktrees,
                current_path.take(),
                std::mem::take(&mut current_head),
                current_branch.take(),
                is_bare,
                is_detached,
                locked_reason.take(),
                prunable_reason.take(),
            );
            is_bare = false;
            is_detached = false;
            continue;
        }

        if let Some(rest) = line.strip_prefix("worktree ") {
            if current_path.is_some() {
                finish_entry(
                    &mut worktrees,
                    current_path.take(),
                    std::mem::take(&mut current_head),
                    current_branch.take(),
                    is_bare,
                    is_detached,
                    locked_reason.take(),
                    prunable_reason.take(),
                );
                is_bare = false;
                is_detached = false;
            }
            current_path = Some(rest.trim().to_string());
        } else if let Some(rest) = line.strip_prefix("HEAD ") {
            current_head = rest.trim().to_string();
        } else if let Some(rest) = line.strip_prefix("branch refs/heads/") {
            current_branch = Some(rest.trim().to_string());
        } else if let Some(rest) = line.strip_prefix("branch ") {
            current_branch = Some(rest.trim().to_string());
        } else if line == "bare" {
            is_bare = true;
        } else if line == "detached" {
            is_detached = true;
        } else if let Some(rest) = line.strip_prefix("locked") {
            let reason = rest.trim();
            locked_reason = Some(if reason.is_empty() {
                "locked".to_string()
            } else {
                reason.to_string()
            });
        } else if let Some(rest) = line.strip_prefix("prunable") {
            let reason = rest.trim();
            prunable_reason = Some(if reason.is_empty() {
                "prunable".to_string()
            } else {
                reason.to_string()
            });
        }
    }

    finish_entry(
        &mut worktrees,
        current_path,
        current_head,
        current_branch,
        is_bare,
        is_detached,
        locked_reason,
        prunable_reason,
    );

    worktrees
}

/// List all worktrees for an open repository.
pub fn list(repo: &gix::Repository) -> Result<Vec<Worktree>> {
    let dir = workdir(repo)?;
    let raw = shell::worktree_list(dir)?;
    Ok(parse_worktree_porcelain(&raw))
}

/// Add a new worktree.
pub fn add(
    repo: &gix::Repository,
    target_path: &Path,
    branch: Option<&str>,
    new_branch: Option<&str>,
    detach: bool,
) -> Result<Worktree> {
    let dir = workdir(repo)?;
    shell::worktree_add(dir, target_path, branch, new_branch, detach)?;
    let all = list(repo)?;
    let target_canonical = target_path.canonicalize().unwrap_or_else(|_| target_path.to_path_buf());
    let target_str = target_canonical.to_string_lossy();
    
    // Find newly added worktree by matching path
    all.into_iter()
        .find(|w| {
            let p = Path::new(&w.path).canonicalize().unwrap_or_else(|_| PathBuf::from(&w.path));
            p == target_canonical || w.path == target_str
        })
        .ok_or_else(|| Error::Git {
            command: "worktree add".into(),
            stderr: "worktree was created but not found in porcelain list".into(),
        })
}

/// Remove a worktree.
pub fn remove(repo: &gix::Repository, target_path: &Path, force: bool) -> Result<()> {
    let dir = workdir(repo)?;
    shell::worktree_remove(dir, target_path, force)
}

/// Lock a worktree.
pub fn lock(repo: &gix::Repository, target_path: &Path, reason: Option<&str>) -> Result<()> {
    let dir = workdir(repo)?;
    shell::worktree_lock(dir, target_path, reason)
}

/// Unlock a worktree.
pub fn unlock(repo: &gix::Repository, target_path: &Path) -> Result<()> {
    let dir = workdir(repo)?;
    shell::worktree_unlock(dir, target_path)
}

/// Prune stale worktrees.
pub fn prune(repo: &gix::Repository) -> Result<()> {
    let dir = workdir(repo)?;
    shell::worktree_prune(dir)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::fixture::Fixture;

    #[test]
    fn parses_porcelain_stream_correctly() {
        let sample = r#"
worktree /home/user/project
HEAD 1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b
branch refs/heads/main

worktree /home/user/project-feature
HEAD 2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c
branch refs/heads/feature-x
locked working on something important

worktree /home/user/project-detached
HEAD 3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d
detached
prunable gitdir does not exist
"#;

        let parsed = parse_worktree_porcelain(sample);
        assert_eq!(parsed.len(), 3);

        assert_eq!(parsed[0].path, "/home/user/project");
        assert_eq!(parsed[0].name, "project");
        assert_eq!(parsed[0].head, "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b");
        assert_eq!(parsed[0].head_short, "1a2b3c4");
        assert_eq!(parsed[0].branch.as_deref(), Some("main"));
        assert!(parsed[0].is_main);
        assert!(!parsed[0].is_detached);
        assert_eq!(parsed[0].locked_reason, None);

        assert_eq!(parsed[1].path, "/home/user/project-feature");
        assert_eq!(parsed[1].name, "project-feature");
        assert_eq!(parsed[1].branch.as_deref(), Some("feature-x"));
        assert!(!parsed[1].is_main);
        assert_eq!(
            parsed[1].locked_reason.as_deref(),
            Some("working on something important")
        );

        assert_eq!(parsed[2].path, "/home/user/project-detached");
        assert!(parsed[2].is_detached);
        assert_eq!(parsed[2].branch, None);
        assert_eq!(
            parsed[2].prunable_reason.as_deref(),
            Some("gitdir does not exist")
        );
    }

    #[test]
    fn worktree_lifecycle_add_lock_unlock_remove() {
        let fixture = Fixture::woven();
        let repo = fixture.open();
        let temp_parent = tempfile::tempdir().expect("temp parent dir");
        let wt_path = temp_parent.path().join("wt-feature");

        // 1. Initial list has the main worktree only
        let initial = list(&repo).expect("list initial worktrees");
        assert_eq!(initial.len(), 1);
        assert!(initial[0].is_main);

        // 2. Add linked worktree with a new branch
        let added = add(
            &repo,
            &wt_path,
            None,
            Some("wt-branch"),
            false,
        )
        .expect("add worktree");
        assert_eq!(added.branch.as_deref(), Some("wt-branch"));
        assert!(!added.is_main);

        let list_after_add = list(&repo).expect("list after add");
        assert_eq!(list_after_add.len(), 2);

        // 3. Lock worktree
        lock(&repo, &wt_path, Some("testing lock")).expect("lock worktree");
        let list_after_lock = list(&repo).expect("list after lock");
        let locked_wt = list_after_lock
            .iter()
            .find(|w| !w.is_main)
            .expect("find locked worktree");
        assert_eq!(locked_wt.locked_reason.as_deref(), Some("testing lock"));

        // 4. Unlock worktree
        unlock(&repo, &wt_path).expect("unlock worktree");
        let list_after_unlock = list(&repo).expect("list after unlock");
        let unlocked_wt = list_after_unlock
            .iter()
            .find(|w| !w.is_main)
            .expect("find unlocked worktree");
        assert_eq!(unlocked_wt.locked_reason, None);

        // 5. Remove worktree
        remove(&repo, &wt_path, true).expect("remove worktree");
        let list_after_remove = list(&repo).expect("list after remove");
        assert_eq!(list_after_remove.len(), 1);
        assert!(list_after_remove[0].is_main);
    }
}
