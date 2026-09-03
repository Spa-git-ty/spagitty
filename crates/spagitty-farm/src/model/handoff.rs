// SPDX-License-Identifier: GPL-3.0-or-later

//! What an agent hands back.
//!
//! The plan's rule is that every agent returns the same structure, and that
//! Spagitty never relies entirely on free-form prose. Both halves matter:
//!
//! * **Same structure** — so the scheduler, the reviewer and the UI read one
//!   type rather than four dialects of "done".
//! * **Not entirely prose** — but *partly* prose, because an agent that is
//!   forced into pure JSON says less, and the summary is what a human reads.
//!
//! So the agent is asked for a fenced JSON block in a documented shape, and
//! [`Handoff::parse`] finds it in a transcript that also contains everything
//! else the agent said. A transcript with no block is not an error: it becomes
//! a handoff whose status is [`HandoffStatus::Unknown`], which is exactly what
//! it is, and verification decides what happens next. Treating a missing block
//! as failure would fail runs that did the work and forgot the envelope.

use serde::{Deserialize, Serialize};

use super::TaskId;

/// What the agent says happened.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum HandoffStatus {
    Completed,
    /// The agent could not finish and says why. This is the path that produces
    /// a proposed follow-up task rather than a failure.
    Blocked,
    Failed,
    /// No structured block was found. Not a verdict — an absence.
    #[default]
    Unknown,
}

/// One test command the agent says it ran.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TestReport {
    pub name: String,
    pub outcome: TestOutcome,
    #[serde(default)]
    pub detail: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TestOutcome {
    Passed,
    Failed,
    Skipped,
}

/// Work the agent noticed was missing.
///
/// The agent proposes; Spagitty owns the DAG. This type is a *proposal* and
/// nothing schedules it — [`crate::orchestrator`] turns an accepted one into a
/// real task with a real identifier.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProposedTask {
    pub title: String,
    #[serde(default)]
    pub description: String,
    /// Existing tasks the proposal says it depends on. Validated before use;
    /// an agent naming a task that does not exist gets the reference dropped
    /// rather than the proposal rejected.
    #[serde(default)]
    pub depends_on: Vec<TaskId>,
}

/// The normalised result of a run.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Handoff {
    #[serde(default)]
    pub status: HandoffStatus,
    #[serde(default)]
    pub summary: String,
    #[serde(default)]
    pub files_changed: Vec<String>,
    #[serde(default)]
    pub commits: Vec<String>,
    #[serde(default)]
    pub tests: Vec<TestReport>,
    #[serde(default)]
    pub risks: Vec<String>,
    #[serde(default)]
    pub questions: Vec<String>,
    #[serde(default)]
    pub proposed_tasks: Vec<ProposedTask>,
}

/// The fence the agent is asked to wrap its handoff in.
///
/// A distinctive marker rather than a bare ```` ```json ```` fence, because an
/// agent writing about JSON — which happens constantly in a codebase with
/// configuration files — would otherwise have its example parsed as its result.
pub const FENCE: &str = "spagitty-handoff";

impl Handoff {
    /// Pull the handoff out of a transcript.
    ///
    /// The **last** block wins. An agent that corrects itself writes a second
    /// block, and the correction is the answer; taking the first would take the
    /// draft. A malformed block is skipped rather than fatal, for the same
    /// reason — the one before it may be good.
    pub fn parse(transcript: &str) -> Handoff {
        let opening = format!("```{FENCE}");
        let mut found: Option<Handoff> = None;

        let mut rest = transcript;
        while let Some(start) = rest.find(&opening) {
            let after = &rest[start + opening.len()..];
            let Some(end) = after.find("```") else {
                // An unterminated fence is the transcript being cut off, which
                // is what a killed agent leaves behind. Nothing to read.
                break;
            };
            if let Ok(handoff) = serde_json::from_str::<Handoff>(after[..end].trim()) {
                found = Some(handoff);
            }
            rest = &after[end + 3..];
        }

        found.unwrap_or_default()
    }

    /// The instructions appended to every prompt.
    ///
    /// Written once, here, beside the parser. A prompt that describes a shape
    /// the parser does not read is the defect this pairing exists to prevent,
    /// and the round-trip test below is what keeps them honest.
    pub fn contract() -> String {
        format!(
            "When you have finished, end your reply with exactly one block in this form:\n\
             \n\
             ```{FENCE}\n\
             {{\n  \
             \"status\": \"completed\" | \"blocked\" | \"failed\",\n  \
             \"summary\": \"one paragraph, for a human\",\n  \
             \"filesChanged\": [\"path/to/file\"],\n  \
             \"commits\": [\"abcdef1\"],\n  \
             \"tests\": [{{\"name\": \"cargo test\", \"outcome\": \"passed\" | \"failed\" | \"skipped\", \"detail\": \"\"}}],\n  \
             \"risks\": [\"what might break\"],\n  \
             \"questions\": [\"what you could not decide\"],\n  \
             \"proposedTasks\": [{{\"title\": \"work you found that is not yours\", \"description\": \"\"}}]\n\
             }}\n\
             ```\n\
             \n\
             Every field except `status` may be omitted. Do not write this block \
             anywhere except at the very end."
        )
    }

    /// True when the agent said it could not finish and explained why.
    pub fn is_blocked(&self) -> bool {
        self.status == HandoffStatus::Blocked
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_transcript_with_no_block_reads_as_unknown() {
        let handoff = Handoff::parse("I did the thing. It went well.");
        assert_eq!(handoff.status, HandoffStatus::Unknown);
        assert!(handoff.summary.is_empty());
    }

    #[test]
    fn the_block_is_found_among_ordinary_output() {
        let transcript = format!(
            "Reading files...\nEditing src/auth.rs\n\n```{FENCE}\n{{\"status\":\"completed\",\"summary\":\"Rotated tokens\",\"filesChanged\":[\"src/auth.rs\"]}}\n```\n"
        );
        let handoff = Handoff::parse(&transcript);
        assert_eq!(handoff.status, HandoffStatus::Completed);
        assert_eq!(handoff.summary, "Rotated tokens");
        assert_eq!(handoff.files_changed, ["src/auth.rs"]);
    }

    #[test]
    fn an_agent_that_corrects_itself_is_believed_the_second_time() {
        let transcript = format!(
            "```{FENCE}\n{{\"status\":\"completed\"}}\n```\nActually the tests fail.\n```{FENCE}\n{{\"status\":\"failed\",\"summary\":\"tests red\"}}\n```"
        );
        assert_eq!(Handoff::parse(&transcript).status, HandoffStatus::Failed);
    }

    #[test]
    fn a_malformed_block_does_not_lose_a_good_one_before_it() {
        let transcript = format!(
            "```{FENCE}\n{{\"status\":\"completed\",\"summary\":\"done\"}}\n```\n```{FENCE}\n{{not json\n```"
        );
        let handoff = Handoff::parse(&transcript);
        assert_eq!(handoff.status, HandoffStatus::Completed);
        assert_eq!(handoff.summary, "done");
    }

    #[test]
    fn a_cut_off_transcript_does_not_hang_or_panic() {
        let transcript = format!("```{FENCE}\n{{\"status\":\"comp");
        assert_eq!(Handoff::parse(&transcript).status, HandoffStatus::Unknown);
    }

    #[test]
    fn ordinary_json_in_the_transcript_is_not_mistaken_for_a_handoff() {
        // The reason the fence is named rather than bare `json`.
        let transcript = "Here is the config:\n```json\n{\"status\":\"completed\"}\n```";
        assert_eq!(Handoff::parse(transcript).status, HandoffStatus::Unknown);
    }

    #[test]
    fn the_contract_describes_a_block_the_parser_reads() {
        // The example inside the instructions is not valid JSON — it is a
        // schema with alternatives — so this asserts the *shape*: the fence the
        // parser looks for, and every field name it deserialises.
        let contract = Handoff::contract();
        assert!(contract.contains(&format!("```{FENCE}")));
        for field in [
            "status",
            "summary",
            "filesChanged",
            "commits",
            "tests",
            "risks",
            "questions",
            "proposedTasks",
        ] {
            assert!(contract.contains(field), "the contract never mentions {field}");
        }
    }

    #[test]
    fn every_field_the_contract_names_deserialises() {
        let json = r#"{
            "status": "blocked",
            "summary": "no persistence layer",
            "filesChanged": ["a.rs"],
            "commits": ["abc1234"],
            "tests": [{"name": "cargo test", "outcome": "failed", "detail": "2 failed"}],
            "risks": ["might break login"],
            "questions": ["which store?"],
            "proposedTasks": [{"title": "Create the repository", "dependsOn": ["TASK-0001"]}]
        }"#;
        let handoff: Handoff = serde_json::from_str(json).unwrap();
        assert!(handoff.is_blocked());
        assert_eq!(handoff.tests[0].outcome, TestOutcome::Failed);
        assert_eq!(handoff.proposed_tasks[0].depends_on[0], TaskId::new("TASK-0001"));
    }
}
