// SPDX-License-Identifier: GPL-3.0-or-later

//! Who is allowed to edit what.
//!
//! Two agents working in two worktrees cannot corrupt each other's files —
//! that is what the worktrees are for. What they *can* do is both edit
//! `UserService.java`, both pass their own tests, and both produce a branch
//! that conflicts with the other at merge time. The cost of finding that out at
//! merge time is two agent runs and a conflict nobody asked for.
//!
//! So a task takes a lease on the paths it declared before it starts, and the
//! scheduler will not start a second task whose paths overlap. This is the
//! plan's "V1 can use path-level locks", and it is deliberately the simple
//! version: declared globs, compared as globs, refused if they intersect.
//!
//! # Why an undeclared task contends with everything
//!
//! `allowed_paths` is optional, and a task with none has not said what it will
//! touch. The safe reading of "I don't know" is "anything", so an undeclared
//! task takes the whole tree and runs alone. The alternative — treating silence
//! as "nothing", and letting it run beside anything — is the reading that
//! produces the merge conflict this module exists to prevent.

use std::collections::BTreeMap;

use crate::error::{Error, Result};
use crate::model::TaskId;

/// The pattern a task with no declared paths holds.
pub const EVERYTHING: &str = "**";

/// Which task holds which paths.
#[derive(Debug, Default, Clone, PartialEq, Eq)]
pub struct Leases {
    held: BTreeMap<TaskId, Vec<String>>,
}

impl Leases {
    /// The paths `task` would hold, given what it declared.
    ///
    /// Empty means everything, for the reason in the module header.
    pub fn claim_of(declared: &[String]) -> Vec<String> {
        if declared.iter().all(|pattern| pattern.trim().is_empty()) {
            return vec![EVERYTHING.to_string()];
        }
        declared
            .iter()
            .map(|pattern| pattern.trim().to_string())
            .filter(|pattern| !pattern.is_empty())
            .collect()
    }

    /// Take the lease, or say who is in the way.
    ///
    /// Re-taking a lease a task already holds succeeds and replaces it: a task
    /// that failed verification and is being run again is the same task, and
    /// refusing it its own paths would deadlock the retry.
    pub fn acquire(&mut self, task: &TaskId, declared: &[String]) -> Result<()> {
        let wanted = Self::claim_of(declared);
        if let Some((holder, path)) = self.conflict(task, &wanted) {
            return Err(Error::PathContended {
                task: task.clone(),
                holder,
                path,
            });
        }
        self.held.insert(task.clone(), wanted);
        Ok(())
    }

    /// Would this task have to wait? The question the scheduler asks before it
    /// starts anything, so a contended task stays queued rather than failing.
    pub fn blocked_by(&self, task: &TaskId, declared: &[String]) -> Option<TaskId> {
        self.conflict(task, &Self::claim_of(declared))
            .map(|(holder, _)| holder)
    }

    pub fn release(&mut self, task: &TaskId) {
        self.held.remove(task);
    }

    pub fn holder_count(&self) -> usize {
        self.held.len()
    }

    /// The first existing lease that overlaps `wanted`, and the pattern that
    /// did it.
    ///
    /// The pattern is carried out so the error can name a path rather than
    /// saying "they overlap", which tells a user nothing about what to change.
    fn conflict(&self, task: &TaskId, wanted: &[String]) -> Option<(TaskId, String)> {
        for (holder, patterns) in &self.held {
            if holder == task {
                continue;
            }
            for held in patterns {
                for want in wanted {
                    if overlaps(held, want) {
                        return Some((holder.clone(), want.clone()));
                    }
                }
            }
        }
        None
    }
}

/// Could these two glob patterns ever name the same file?
///
/// Not a full glob intersection — that is a research problem — but the answer
/// for the shapes that occur in practice: a literal path, a directory with a
/// `**` tail, and a `*` inside one segment. When it cannot tell, it says yes.
/// Erring towards "they overlap" costs parallelism; erring the other way costs
/// a merge conflict, and the whole module exists to avoid that one.
pub fn overlaps(left: &str, right: &str) -> bool {
    let left = left.trim_start_matches("./");
    let right = right.trim_start_matches("./");
    if left == right {
        return true;
    }
    // A prefix ending in `**` swallows everything below it.
    if let Some(prefix) = left.strip_suffix("**") {
        if right.starts_with(prefix.trim_end_matches('/')) || prefix.is_empty() {
            return true;
        }
    }
    if let Some(prefix) = right.strip_suffix("**") {
        if left.starts_with(prefix.trim_end_matches('/')) || prefix.is_empty() {
            return true;
        }
    }
    segments_overlap(&split(left), &split(right))
}

fn split(pattern: &str) -> Vec<&str> {
    pattern.split('/').filter(|part| !part.is_empty()).collect()
}

/// Compare segment by segment.
///
/// `**` in the middle matches any number of segments, so once one is reached
/// the rest is assumed to match: a precise answer would need a backtracking
/// matcher, and the imprecise answer here is the conservative one.
fn segments_overlap(left: &[&str], right: &[&str]) -> bool {
    let mut left_index = 0;
    let mut right_index = 0;
    loop {
        match (left.get(left_index), right.get(right_index)) {
            (None, None) => return true,
            // One pattern ran out. `src/auth` and `src/auth/x.rs` name
            // different things — a file and a directory's contents — and the
            // shorter one is a directory only if it was written with a tail.
            (None, Some(_)) | (Some(_), None) => return false,
            (Some(&"**"), _) | (_, Some(&"**")) => return true,
            (Some(a), Some(b)) => {
                if !segment_overlaps(a, b) {
                    return false;
                }
                left_index += 1;
                right_index += 1;
            }
        }
    }
}

/// Two single segments, either of which may contain `*`.
fn segment_overlaps(left: &str, right: &str) -> bool {
    if left == right {
        return true;
    }
    if !left.contains('*') && !right.contains('*') {
        return false;
    }
    // `*.rs` and `auth.rs` overlap; `*.rs` and `auth.ts` do not. Comparing the
    // literal head and tail either side of the star is enough for the patterns
    // people actually write, and anything with more than one star is treated as
    // matching, which is the conservative direction.
    let (left_head, left_tail) = around_star(left);
    let (right_head, right_tail) = around_star(right);
    let head = left_head.len().min(right_head.len());
    let tail = left_tail.len().min(right_tail.len());
    left_head[..head] == right_head[..head]
        && left_tail[left_tail.len() - tail..] == right_tail[right_tail.len() - tail..]
}

fn around_star(pattern: &str) -> (&str, &str) {
    match pattern.split_once('*') {
        Some((head, tail)) => (head, tail.rsplit_once('*').map(|(_, t)| t).unwrap_or(tail)),
        None => (pattern, pattern),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn task(name: &str) -> TaskId {
        TaskId::new(name)
    }

    #[test]
    fn two_tasks_in_different_trees_run_together() {
        let mut leases = Leases::default();
        leases
            .acquire(&task("A"), &["backend/src/auth/**".into()])
            .unwrap();
        assert!(leases
            .acquire(&task("B"), &["frontend/src/auth/**".into()])
            .is_ok());
        assert_eq!(leases.holder_count(), 2);
    }

    #[test]
    fn two_tasks_on_the_same_file_do_not() {
        let mut leases = Leases::default();
        leases
            .acquire(&task("A"), &["backend/src/auth/UserService.java".into()])
            .unwrap();
        let error = leases
            .acquire(&task("B"), &["backend/src/auth/UserService.java".into()])
            .unwrap_err();
        assert_eq!(error.kind(), "pathContended");
        assert!(error.to_string().contains("UserService.java"));
    }

    #[test]
    fn a_directory_lease_covers_the_files_under_it() {
        let mut leases = Leases::default();
        leases.acquire(&task("A"), &["src/auth/**".into()]).unwrap();
        assert_eq!(
            leases.blocked_by(&task("B"), &["src/auth/token.rs".into()]),
            Some(task("A"))
        );
    }

    #[test]
    fn a_task_that_declared_nothing_runs_alone() {
        let mut leases = Leases::default();
        leases.acquire(&task("A"), &[]).unwrap();
        assert_eq!(
            leases.blocked_by(&task("B"), &["docs/README.md".into()]),
            Some(task("A"))
        );
    }

    #[test]
    fn nothing_may_run_beside_a_task_that_declared_nothing() {
        let mut leases = Leases::default();
        leases.acquire(&task("A"), &["docs/**".into()]).unwrap();
        assert_eq!(leases.blocked_by(&task("B"), &[]), Some(task("A")));
    }

    #[test]
    fn a_task_may_retake_its_own_lease() {
        // A retry after a failed verification is the same task, and refusing it
        // its own paths would deadlock the loop.
        let mut leases = Leases::default();
        leases.acquire(&task("A"), &["src/**".into()]).unwrap();
        assert!(leases.acquire(&task("A"), &["src/**".into()]).is_ok());
        assert_eq!(leases.holder_count(), 1);
    }

    #[test]
    fn releasing_lets_the_next_task_in() {
        let mut leases = Leases::default();
        leases.acquire(&task("A"), &["src/**".into()]).unwrap();
        leases.release(&task("A"));
        assert!(leases.acquire(&task("B"), &["src/auth.rs".into()]).is_ok());
    }

    #[test]
    fn blank_patterns_are_not_a_declaration() {
        assert_eq!(Leases::claim_of(&["  ".into()]), [EVERYTHING]);
        assert_eq!(Leases::claim_of(&[]), [EVERYTHING]);
        assert_eq!(
            Leases::claim_of(&["src/**".into(), "  ".into()]),
            ["src/**"]
        );
    }

    #[test]
    fn a_leading_dot_slash_does_not_hide_an_overlap() {
        assert!(overlaps("./src/auth.rs", "src/auth.rs"));
    }

    #[test]
    fn sibling_files_in_one_directory_do_not_overlap() {
        assert!(!overlaps("src/auth.rs", "src/token.rs"));
        assert!(!overlaps("src/auth/**", "src/api/**"));
    }

    #[test]
    fn a_star_matches_within_a_segment_only() {
        assert!(overlaps("src/*.rs", "src/auth.rs"));
        assert!(!overlaps("src/*.rs", "src/auth.ts"));
        // One star does not cross a directory boundary.
        assert!(!overlaps("src/*.rs", "src/auth/token.rs"));
    }

    #[test]
    fn a_double_star_in_the_middle_is_treated_as_matching() {
        // Conservative on purpose: the cost of a false overlap is one task
        // waiting, and the cost of a missed one is a merge conflict.
        assert!(overlaps("src/**/auth.rs", "src/backend/token.rs"));
    }

    #[test]
    fn a_directory_and_a_file_of_the_same_name_are_not_the_same_thing() {
        assert!(!overlaps("src/auth", "src/auth/token.rs"));
        assert!(overlaps("src/auth/**", "src/auth/token.rs"));
    }

    #[test]
    fn everything_overlaps_everything() {
        assert!(overlaps(EVERYTHING, "any/path/at/all.rs"));
        assert!(overlaps("any/path/at/all.rs", EVERYTHING));
    }
}
