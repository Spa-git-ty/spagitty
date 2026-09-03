// SPDX-License-Identifier: GPL-3.0-or-later

//! The farm's own error type.
//!
//! Separate from [`spagitty_core::Error`] rather than an extension of it,
//! because the two answer different questions. A core error says a *git*
//! operation failed; a farm error says an *orchestration* rule was broken —
//! a dependency cycle, a path already leased to another task, an agent that is
//! not installed. Folding the second set into the first would put orchestration
//! vocabulary into a crate that has no orchestration in it.
//!
//! Git failures still reach callers: [`Error::Git`] wraps the core error whole,
//! so the message the user sees is git's own words rather than a summary of
//! them.

use std::fmt;

use crate::model::{AgentId, TaskId};

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    /// A git operation failed. Carried whole so the reason survives.
    #[error(transparent)]
    Git(#[from] spagitty_core::Error),

    #[error("input/output: {0}")]
    Io(#[from] std::io::Error),

    #[error("could not read the farm's saved state: {0}")]
    Corrupt(#[from] serde_json::Error),

    /// The identifier is well-formed but names nothing this farm knows.
    #[error("no such task: {0}")]
    NoSuchTask(TaskId),

    #[error("no such agent: {0}")]
    NoSuchAgent(AgentId),

    #[error("no farm is open")]
    NoFarm,

    /// The agent's executable is not on this machine. Distinguished from a
    /// failed run because the fix is an installation, not a retry.
    #[error("{0} is not installed, or is not on PATH")]
    AgentUnavailable(String),

    /// The dependency graph does not terminate. Named with the cycle, because
    /// "there is a cycle" is not actionable and "A → B → A" is.
    #[error("these tasks depend on each other in a circle: {0}")]
    DependencyCycle(String),

    /// A task wants a path another running task has leased. The farm refuses
    /// rather than letting two agents edit the same file in two worktrees and
    /// discovering it at merge time.
    #[error("{task} would edit {path}, which {holder} is already working on")]
    PathContended {
        task: TaskId,
        holder: TaskId,
        path: String,
    },

    /// A transition the state machine does not have. The message names both
    /// ends so a caller can tell a stale UI from a real defect.
    #[error("a task that is {from} cannot be {to}")]
    BadTransition { from: String, to: String },

    /// The rule from the plan that the review system exists to enforce: the
    /// agent that wrote the change may not be the one that approves it.
    #[error("{0} implemented this task and so cannot review it")]
    SelfReview(AgentId),

    /// Something the human has to answer before the farm may continue.
    #[error("{0}")]
    Refused(String),
}

/// A short machine-readable tag for the webview.
///
/// The UI needs to *branch* on the kind of failure — an unavailable agent gets
/// an install hint, a contended path gets a "wait or reassign" prompt — and
/// matching on English prose is how that breaks the first time a message is
/// reworded.
impl Error {
    pub fn kind(&self) -> &'static str {
        match self {
            Error::Git(_) => "git",
            Error::Io(_) => "io",
            Error::Corrupt(_) => "corrupt",
            Error::NoSuchTask(_) => "noSuchTask",
            Error::NoSuchAgent(_) => "noSuchAgent",
            Error::NoFarm => "noFarm",
            Error::AgentUnavailable(_) => "agentUnavailable",
            Error::DependencyCycle(_) => "dependencyCycle",
            Error::PathContended { .. } => "pathContended",
            Error::BadTransition { .. } => "badTransition",
            Error::SelfReview(_) => "selfReview",
            Error::Refused(_) => "refused",
        }
    }
}

/// Serialised as `{ kind, message }` so the webview gets both halves.
impl serde::Serialize for Error {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error> {
        use serde::ser::SerializeStruct;
        let mut out = serializer.serialize_struct("FarmError", 2)?;
        out.serialize_field("kind", self.kind())?;
        out.serialize_field("message", &self.to_string())?;
        out.end()
    }
}

/// Rendered for the places that want one line rather than a struct — the
/// activity log, mostly.
pub struct OneLine<'a>(pub &'a Error);

impl fmt::Display for OneLine<'_> {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}: {}", self.0.kind(), self.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_variant_has_its_own_kind() {
        // The UI branches on these; two variants sharing a tag would make one
        // of them unreachable in the interface without failing anything here.
        let all = [
            Error::NoFarm.kind(),
            Error::NoSuchTask(TaskId::new("TASK-0001")).kind(),
            Error::NoSuchAgent(AgentId::new("claude")).kind(),
            Error::AgentUnavailable("codex".into()).kind(),
            Error::DependencyCycle("A → B → A".into()).kind(),
            Error::SelfReview(AgentId::new("claude")).kind(),
            Error::Refused("no".into()).kind(),
        ];
        let unique: std::collections::HashSet<_> = all.iter().collect();
        assert_eq!(unique.len(), all.len());
    }

    #[test]
    fn serialises_as_kind_and_message() {
        let json = serde_json::to_value(Error::AgentUnavailable("codex".into())).unwrap();
        assert_eq!(json["kind"], "agentUnavailable");
        assert!(json["message"].as_str().unwrap().contains("codex"));
    }

    #[test]
    fn a_contended_path_names_both_tasks() {
        let error = Error::PathContended {
            task: TaskId::new("TASK-0002"),
            holder: TaskId::new("TASK-0001"),
            path: "src/auth.rs".into(),
        };
        let text = error.to_string();
        assert!(text.contains("TASK-0002"));
        assert!(text.contains("TASK-0001"));
        assert!(text.contains("src/auth.rs"));
    }

    #[test]
    fn one_line_carries_the_kind() {
        let error = Error::NoFarm;
        assert_eq!(OneLine(&error).to_string(), "noFarm: no farm is open");
    }
}
