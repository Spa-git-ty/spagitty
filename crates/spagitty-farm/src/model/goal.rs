// SPDX-License-Identifier: GPL-3.0-or-later

//! What the farm is for.
//!
//! One sentence from the user, plus the constraints they want honoured. It is
//! separate from [`crate::model::Farm`] because a goal outlives a run: a farm
//! can be cancelled and restarted against the same goal, and the record of what
//! was asked for should not be rewritten when it is.

use serde::{Deserialize, Serialize};

use super::GoalId;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Goal {
    pub id: GoalId,
    /// "Add GitHub OAuth login". The whole of what the user typed.
    pub title: String,
    #[serde(default)]
    pub description: String,
    /// Extra rules for this goal only, on top of the repository's `AGENTS.md`.
    #[serde(default)]
    pub constraints: Vec<String>,
    pub created_ms: u64,
}

impl Goal {
    pub fn new(id: GoalId, title: impl Into<String>, now: u64) -> Self {
        Goal {
            id,
            title: title.into(),
            description: String::new(),
            constraints: Vec::new(),
            created_ms: now,
        }
    }

    /// The goal as an agent reads it: the title, then the description, then the
    /// constraints as a list.
    ///
    /// Built here rather than in the context builder so that every prompt —
    /// implementation, review, planning — states the goal in the same words.
    /// Three formatters would drift, and an agent reviewing against a
    /// differently-worded goal is reviewing against a different goal.
    pub fn brief(&self) -> String {
        let mut out = self.title.clone();
        if !self.description.trim().is_empty() {
            out.push_str("\n\n");
            out.push_str(self.description.trim());
        }
        if !self.constraints.is_empty() {
            out.push_str("\n\nConstraints:\n");
            for constraint in &self.constraints {
                out.push_str("- ");
                out.push_str(constraint);
                out.push('\n');
            }
        }
        out.trim_end().to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_bare_goal_briefs_as_its_title() {
        let goal = Goal::new(GoalId::new("g1"), "Add OAuth login", 0);
        assert_eq!(goal.brief(), "Add OAuth login");
    }

    #[test]
    fn constraints_are_listed_under_the_prose() {
        let mut goal = Goal::new(GoalId::new("g1"), "Add OAuth login", 0);
        goal.description = "  GitHub only.  ".into();
        goal.constraints = vec!["No new dependencies".into(), "Keep the tests green".into()];
        let brief = goal.brief();
        assert_eq!(
            brief,
            "Add OAuth login\n\nGitHub only.\n\nConstraints:\n- No new dependencies\n- Keep the tests green"
        );
    }
}
