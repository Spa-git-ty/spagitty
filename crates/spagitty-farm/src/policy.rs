// SPDX-License-Identifier: GPL-3.0-or-later

//! The repository's own rules for agents.
//!
//! A farm without this produces agents that write in a house style nobody uses,
//! add dependencies the project has refused, and reformat files as they pass.
//! The fix is not a longer prompt; it is the repository saying what it wants,
//! once, in a file that is committed and reviewed like everything else.
//!
//! # `AGENTS.md` is authoritative, and the others are read anyway
//!
//! Spagitty's normalised policy file is `AGENTS.md`, which is also what several
//! other tools have converged on. But a repository that already has `CLAUDE.md`
//! or `.cursor/rules` has already written its rules down, and asking the user
//! to write them a third time to use a farm is asking them not to use a farm.
//!
//! So all of them are read, `AGENTS.md` wins where they disagree, and the
//! interface says which files were found. What is *not* done is merging them
//! cleverly: they are concatenated under headings that name their source, and
//! the agent is told which one governs. A merge that silently dropped a rule
//! would be worse than a prompt that contains two.

use std::path::Path;

use serde::{Deserialize, Serialize};

/// How much of a policy file is used.
///
/// Sixty-four kilobytes. A rules file longer than that is a manual, and pasting
/// a manual into every prompt for every task is how a farm spends its budget on
/// context rather than on work.
pub const MAX_BYTES: usize = 64 * 1024;

/// The files that are read, in the order they are appended. The first is the
/// one that governs.
pub const SOURCES: [&str; 4] = [
    "AGENTS.md",
    "CLAUDE.md",
    ".cursor/rules",
    ".github/copilot-instructions.md",
];

/// One policy file that was found.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PolicySource {
    /// Repository-relative path.
    pub path: String,
    /// True for the file whose rules win.
    pub authoritative: bool,
    pub bytes: usize,
}

/// The repository's rules, assembled.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Policy {
    pub sources: Vec<PolicySource>,
    /// The text to put in a prompt. Empty when the repository has no rules.
    pub text: String,
}

impl Policy {
    pub fn is_empty(&self) -> bool {
        self.text.trim().is_empty()
    }
}

/// Read whatever policy files the repository has.
///
/// A repository with none produces an empty policy rather than an error. That
/// is the common case on the first run, and the Farm screen turns it into an
/// offer to write one rather than a failure.
pub fn read(repo: &Path) -> Policy {
    let mut sources = Vec::new();
    let mut text = String::new();

    for (index, name) in SOURCES.iter().enumerate() {
        let path = repo.join(name);
        let Ok(content) = std::fs::read_to_string(&path) else {
            continue;
        };
        let content = truncate(&content);
        if content.trim().is_empty() {
            continue;
        }
        sources.push(PolicySource {
            path: (*name).to_string(),
            authoritative: index == 0,
            bytes: content.len(),
        });
        if !text.is_empty() {
            text.push_str("\n\n");
        }
        text.push_str(&format!("## From {name}\n\n"));
        text.push_str(content.trim());
    }

    // Only worth saying when there is more than one, and only then because an
    // agent reading two sets of rules needs to know which to follow.
    if sources.len() > 1 {
        text.push_str("\n\n(Where these disagree, AGENTS.md governs.)");
    }

    Policy { sources, text }
}

/// The starter `AGENTS.md` Spagitty offers to write.
///
/// A template rather than a generated file: what belongs in it is knowledge
/// about the project that Spagitty does not have, and a generated file full of
/// plausible-sounding rules nobody wrote is worse than no file — agents would
/// follow it.
pub fn template(goal: &str) -> String {
    format!(
        "<!-- Rules for coding agents working in this repository. -->\n\
         <!-- Spagitty reads this file and puts it in every agent's prompt. -->\n\
         \n\
         # Agent rules\n\
         \n\
         ## Product goal\n\
         \n\
         {goal}\n\
         \n\
         ## Architecture rules\n\
         \n\
         - \n\
         \n\
         ## Coding rules\n\
         \n\
         - \n\
         \n\
         ## Forbidden changes\n\
         \n\
         - Do not add a dependency without saying why in the handoff.\n\
         - Do not reformat files you are not otherwise changing.\n\
         \n\
         ## Testing requirements\n\
         \n\
         - \n\
         \n\
         ## Definition of done\n\
         \n\
         A task is complete only when:\n\
         \n\
         1. its acceptance criteria are met;\n\
         2. the tests pass;\n\
         3. the build succeeds;\n\
         4. no conflicts are left unresolved;\n\
         5. a review has completed, where one is required.\n"
    )
}

/// Cut at a character boundary, and say so.
fn truncate(content: &str) -> String {
    if content.len() <= MAX_BYTES {
        return content.to_string();
    }
    let mut end = MAX_BYTES;
    while end > 0 && !content.is_char_boundary(end) {
        end -= 1;
    }
    format!("{}\n\n[truncated by Spagitty]", &content[..end])
}

#[cfg(test)]
mod tests {
    use super::*;

    fn repo() -> tempfile::TempDir {
        tempfile::tempdir().unwrap()
    }

    fn write(dir: &tempfile::TempDir, name: &str, content: &str) {
        let path = dir.path().join(name);
        std::fs::create_dir_all(path.parent().unwrap()).unwrap();
        std::fs::write(path, content).unwrap();
    }

    #[test]
    fn a_repository_with_no_rules_has_an_empty_policy() {
        let policy = read(repo().path());
        assert!(policy.is_empty());
        assert!(policy.sources.is_empty());
    }

    #[test]
    fn agents_md_is_read_and_marked_authoritative() {
        let dir = repo();
        write(&dir, "AGENTS.md", "# Rules\n\nNo new dependencies.");
        let policy = read(dir.path());
        assert_eq!(policy.sources.len(), 1);
        assert!(policy.sources[0].authoritative);
        assert!(policy.text.contains("No new dependencies."));
    }

    #[test]
    fn a_repository_that_only_has_claude_md_is_still_read() {
        let dir = repo();
        write(&dir, "CLAUDE.md", "Use tabs.");
        let policy = read(dir.path());
        assert_eq!(policy.sources.len(), 1);
        assert_eq!(policy.sources[0].path, "CLAUDE.md");
        assert!(!policy.sources[0].authoritative);
        assert!(policy.text.contains("Use tabs."));
    }

    #[test]
    fn every_source_is_included_and_named() {
        let dir = repo();
        write(&dir, "AGENTS.md", "Rule one.");
        write(&dir, "CLAUDE.md", "Rule two.");
        write(&dir, ".cursor/rules", "Rule three.");
        let policy = read(dir.path());
        assert_eq!(policy.sources.len(), 3);
        for rule in ["Rule one.", "Rule two.", "Rule three."] {
            assert!(policy.text.contains(rule), "{rule} was dropped");
        }
        for name in ["AGENTS.md", "CLAUDE.md", ".cursor/rules"] {
            assert!(policy.text.contains(&format!("## From {name}")));
        }
    }

    #[test]
    fn the_agent_is_told_which_file_wins_when_there_are_several() {
        let dir = repo();
        write(&dir, "AGENTS.md", "a");
        write(&dir, "CLAUDE.md", "b");
        assert!(read(dir.path()).text.contains("AGENTS.md governs"));
    }

    #[test]
    fn one_file_needs_no_precedence_note() {
        let dir = repo();
        write(&dir, "AGENTS.md", "a");
        assert!(!read(dir.path()).text.contains("governs"));
    }

    #[test]
    fn an_empty_rules_file_is_not_a_source() {
        let dir = repo();
        write(&dir, "AGENTS.md", "   \n\n");
        assert!(read(dir.path()).is_empty());
    }

    #[test]
    fn an_enormous_rules_file_is_cut() {
        let dir = repo();
        write(&dir, "AGENTS.md", &"x".repeat(MAX_BYTES * 2));
        let policy = read(dir.path());
        assert!(policy.text.len() < MAX_BYTES * 2);
        assert!(policy.text.contains("[truncated by Spagitty]"));
    }

    #[test]
    fn cutting_never_splits_a_character() {
        let dir = repo();
        write(&dir, "AGENTS.md", &"é".repeat(MAX_BYTES));
        // A naive byte slice here would panic rather than truncate.
        assert!(read(dir.path()).text.contains("[truncated by Spagitty]"));
    }

    #[test]
    fn the_template_carries_the_goal_and_the_definition_of_done() {
        let text = template("Add OAuth login");
        assert!(text.contains("Add OAuth login"));
        assert!(text.contains("Definition of done"));
        assert!(text.contains("Forbidden changes"));
    }
}
