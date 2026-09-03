// SPDX-License-Identifier: GPL-3.0-or-later

//! One execution of one agent against one task.
//!
//! A task can be run more than once — a review asking for changes, a
//! verification failure, a retry after a crash — so the run is the record, not
//! the task. Without it "what did Codex actually do here" has no answer after
//! the second attempt overwrites the first.

use serde::{Deserialize, Serialize};

use super::{AgentId, RunId, TaskId};

/// Which part of the pipeline this run was.
///
/// The same machinery starts a process for all four, and the phase is what
/// tells the reader — and the reviewer-routing rule — whether the agent was
/// writing code or judging somebody else's.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum RunPhase {
    Planning,
    Implementation,
    Review,
}

/// How a run ended.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", tag = "state")]
pub enum RunOutcome {
    /// Still going.
    Running,
    /// The process exited zero.
    Completed { exit_code: i32 },
    /// The process exited non-zero, or could not be started at all.
    Failed { exit_code: Option<i32>, reason: String },
    /// A person stopped it. Never a failure — the farm did what it was told.
    Cancelled,
}

impl RunOutcome {
    pub fn is_finished(&self) -> bool {
        !matches!(self, RunOutcome::Running)
    }
}

/// The record of one execution.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentRun {
    pub id: RunId,
    pub task: TaskId,
    pub agent: AgentId,
    pub phase: RunPhase,
    pub outcome: RunOutcome,
    /// The command line as it was spawned, so the activity log can show what
    /// ran rather than what somebody remembered to describe. The same principle
    /// as `spagitty_core::record` for git.
    pub command: Vec<String>,
    pub started_ms: u64,
    #[serde(default)]
    pub ended_ms: Option<u64>,
    /// Where the raw stdout/stderr transcript was written, relative to the
    /// farm's log directory. The transcript itself is not held in memory: an
    /// agent can produce megabytes, and the UI reads a tail.
    #[serde(default)]
    pub log_file: Option<String>,
}

impl AgentRun {
    pub fn duration_ms(&self) -> Option<u64> {
        self.ended_ms.map(|ended| ended.saturating_sub(self.started_ms))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn run(outcome: RunOutcome, ended: Option<u64>) -> AgentRun {
        AgentRun {
            id: RunId::new("r1"),
            task: TaskId::new("TASK-0001"),
            agent: AgentId::new("claude"),
            phase: RunPhase::Implementation,
            outcome,
            command: vec!["claude".into(), "-p".into()],
            started_ms: 1_000,
            ended_ms: ended,
            log_file: None,
        }
    }

    #[test]
    fn a_running_run_has_no_duration() {
        assert_eq!(run(RunOutcome::Running, None).duration_ms(), None);
        assert!(!RunOutcome::Running.is_finished());
    }

    #[test]
    fn a_finished_run_measures_from_start_to_end() {
        let finished = run(RunOutcome::Completed { exit_code: 0 }, Some(3_500));
        assert_eq!(finished.duration_ms(), Some(2_500));
        assert!(finished.outcome.is_finished());
    }

    #[test]
    fn a_clock_that_went_backwards_does_not_underflow() {
        // Wall-clock time can move backwards across an NTP correction, and an
        // unsigned subtraction there would panic in a release build's debug
        // assertions and produce a nonsense duration in one without.
        let odd = run(RunOutcome::Cancelled, Some(500));
        assert_eq!(odd.duration_ms(), Some(0));
    }
}
