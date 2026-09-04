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
    Failed {
        exit_code: Option<i32>,
        reason: String,
    },
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
    /// When this run last said anything (FEAT-077).
    ///
    /// A model can think for a long time, so silence is not failure — but a run
    /// that has been silent for six minutes and one that died four minutes ago
    /// look identical, and only one of them is worth interrupting. The farm
    /// records when it last heard something and says so; it never stops
    /// anything on the strength of it.
    #[serde(default)]
    pub last_output_ms: Option<u64>,
}

impl AgentRun {
    pub fn duration_ms(&self) -> Option<u64> {
        self.ended_ms
            .map(|ended| ended.saturating_sub(self.started_ms))
    }

    /// How long this run has been silent, at `now`.
    ///
    /// From the last line it produced, or from when it started if it has not
    /// produced one — a run that has said nothing at all is the case this
    /// exists for. `None` once the run is over: a finished run is not quiet,
    /// it is finished.
    pub fn quiet_for_ms(&self, now: u64) -> Option<u64> {
        if self.outcome.is_finished() {
            return None;
        }
        let heard = self.last_output_ms.unwrap_or(self.started_ms);
        Some(now.saturating_sub(heard))
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
            last_output_ms: None,
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

    #[test]
    fn a_finished_run_is_not_quiet_it_is_finished() {
        let done = run(RunOutcome::Completed { exit_code: 0 }, Some(5_000));
        assert_eq!(done.quiet_for_ms(9_000), None);
    }

    #[test]
    fn a_run_that_has_said_nothing_is_measured_from_when_it_started() {
        // The case this exists for: an agent that produced no output at all
        // looks exactly like one that died on the first second.
        let running = run(RunOutcome::Running, None);
        assert_eq!(running.quiet_for_ms(61_000), Some(60_000));
    }

    #[test]
    fn a_run_that_has_spoken_is_measured_from_the_last_thing_it_said() {
        let mut running = run(RunOutcome::Running, None);
        running.last_output_ms = Some(50_000);
        assert_eq!(running.quiet_for_ms(60_000), Some(10_000));
    }
}
