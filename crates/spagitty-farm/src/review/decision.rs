// SPDX-License-Identifier: GPL-3.0-or-later

//! What a reviewing agent concluded.
//!
//! Parsed out of the reviewer's transcript in the same way a handoff is, and
//! for the same reason: a review that has to be read by a person before
//! anything can happen is not a review the farm can act on.
//!
//! A transcript with no verdict block is [`Decision::Blocked`] rather than
//! approved. That direction is not arbitrary — an unreadable review must never
//! be the thing that merges a change.

use serde::{Deserialize, Serialize};

/// The fence a reviewer is asked to wrap its verdict in.
pub const FENCE: &str = "spagitty-review";

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Decision {
    Approve,
    RequestChanges,
    /// The reviewer could not decide, or said nothing readable.
    #[default]
    Blocked,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Severity {
    High,
    Medium,
    Low,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Issue {
    pub severity: Severity,
    #[serde(default)]
    pub file: String,
    pub message: String,
}

/// One review.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Review {
    #[serde(default)]
    pub decision: Decision,
    #[serde(default)]
    pub summary: String,
    #[serde(default)]
    pub issues: Vec<Issue>,
}

impl Review {
    /// Find the verdict in a transcript. Last block wins, as with a handoff.
    pub fn parse(transcript: &str) -> Review {
        let opening = format!("```{FENCE}");
        let mut found: Option<Review> = None;
        let mut rest = transcript;
        while let Some(start) = rest.find(&opening) {
            let after = &rest[start + opening.len()..];
            let Some(end) = after.find("```") else { break };
            if let Ok(review) = serde_json::from_str::<Review>(after[..end].trim()) {
                found = Some(review);
            }
            rest = &after[end + 3..];
        }
        found.unwrap_or_default()
    }

    /// The instructions appended to a review prompt.
    pub fn contract() -> String {
        format!(
            "End your reply with exactly one block in this form:\n\
             \n\
             ```{FENCE}\n\
             {{\n  \
             \"decision\": \"approve\" | \"request_changes\" | \"blocked\",\n  \
             \"summary\": \"one paragraph, for a human\",\n  \
             \"issues\": [{{\"severity\": \"high\" | \"medium\" | \"low\", \"file\": \"src/auth.rs\", \"message\": \"what is wrong\"}}]\n\
             }}\n\
             ```\n\
             \n\
             Approve only if the acceptance criteria are met. If you cannot tell, \
             say `blocked` and explain why."
        )
    }

    pub fn approved(&self) -> bool {
        self.decision == Decision::Approve
    }

    /// The issues worth blocking on, most severe first.
    pub fn blocking(&self) -> Vec<&Issue> {
        let mut issues: Vec<&Issue> = self
            .issues
            .iter()
            .filter(|issue| issue.severity != Severity::Low)
            .collect();
        issues.sort_by_key(|issue| issue.severity);
        issues
    }

    /// What the implementing agent is told to fix, as prose.
    pub fn change_request(&self) -> String {
        let mut out = String::new();
        if !self.summary.trim().is_empty() {
            out.push_str(self.summary.trim());
            out.push_str("\n\n");
        }
        for issue in self.blocking() {
            out.push_str("- ");
            if !issue.file.is_empty() {
                out.push_str(&issue.file);
                out.push_str(": ");
            }
            out.push_str(&issue.message);
            out.push('\n');
        }
        out.trim_end().to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_transcript_with_no_verdict_does_not_approve() {
        let review = Review::parse("Looks good to me!");
        assert_eq!(review.decision, Decision::Blocked);
        assert!(!review.approved());
    }

    #[test]
    fn an_approval_is_read() {
        let transcript = format!(
            "Checked it.\n```{FENCE}\n{{\"decision\":\"approve\",\"summary\":\"Fine\"}}\n```"
        );
        let review = Review::parse(&transcript);
        assert!(review.approved());
        assert_eq!(review.summary, "Fine");
    }

    #[test]
    fn requested_changes_carry_their_issues() {
        let transcript = format!(
            "```{FENCE}\n{{\"decision\":\"request_changes\",\"issues\":[{{\"severity\":\"high\",\"file\":\"src/auth.rs\",\"message\":\"Refresh token is not invalidated.\"}}]}}\n```"
        );
        let review = Review::parse(&transcript);
        assert_eq!(review.decision, Decision::RequestChanges);
        assert_eq!(review.blocking().len(), 1);
        assert!(review
            .change_request()
            .contains("src/auth.rs: Refresh token is not invalidated."));
    }

    #[test]
    fn high_severity_issues_come_first() {
        let review = Review {
            decision: Decision::RequestChanges,
            summary: String::new(),
            issues: vec![
                Issue {
                    severity: Severity::Medium,
                    file: String::new(),
                    message: "b".into(),
                },
                Issue {
                    severity: Severity::High,
                    file: String::new(),
                    message: "a".into(),
                },
            ],
        };
        assert_eq!(review.blocking()[0].message, "a");
    }

    #[test]
    fn low_severity_notes_do_not_block() {
        let review = Review {
            decision: Decision::RequestChanges,
            summary: "nits".into(),
            issues: vec![Issue {
                severity: Severity::Low,
                file: String::new(),
                message: "naming".into(),
            }],
        };
        assert!(review.blocking().is_empty());
        assert_eq!(review.change_request(), "nits");
    }

    #[test]
    fn the_contract_describes_the_block_the_parser_reads() {
        let contract = Review::contract();
        assert!(contract.contains(&format!("```{FENCE}")));
        for field in [
            "decision",
            "summary",
            "issues",
            "severity",
            "approve",
            "request_changes",
        ] {
            assert!(
                contract.contains(field),
                "the contract never mentions {field}"
            );
        }
    }

    #[test]
    fn a_reviewer_that_corrects_itself_is_believed_the_second_time() {
        let transcript = format!(
            "```{FENCE}\n{{\"decision\":\"approve\"}}\n```\nOn reflection:\n```{FENCE}\n{{\"decision\":\"request_changes\"}}\n```"
        );
        assert_eq!(
            Review::parse(&transcript).decision,
            Decision::RequestChanges
        );
    }

    #[test]
    fn ordinary_json_is_not_mistaken_for_a_verdict() {
        assert_eq!(
            Review::parse("```json\n{\"decision\":\"approve\"}\n```").decision,
            Decision::Blocked
        );
    }
}
