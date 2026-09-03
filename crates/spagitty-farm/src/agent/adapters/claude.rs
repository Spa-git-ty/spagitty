// SPDX-License-Identifier: GPL-3.0-or-later

//! Claude Code.
//!
//! Invoked in print mode — `claude -p <prompt>` — which runs the whole turn to
//! completion with no terminal attached and writes the transcript to standard
//! output. That is exactly the shape the farm's runner wants, and it is why
//! this is the provider the first end-to-end path was built against.
//!
//! The prompt goes on the command line rather than through standard input
//! because print mode treats piped stdin as *additional context* rather than as
//! the instruction, and a farm prompt is the instruction.

use std::path::PathBuf;

use crate::agent::adapter::{AgentAdapter, AgentCommand, AgentRunRequest};
use crate::model::{
    AgentCapability, AgentDefinition, AgentId, AgentInputMode, AgentProvider, AgentRole,
    AgentTraits,
};

pub struct ClaudeAdapter;

impl AgentAdapter for ClaudeAdapter {
    fn provider(&self) -> AgentProvider {
        AgentProvider::ClaudeCode
    }

    fn executables(&self) -> &'static [&'static str] {
        &["claude"]
    }

    fn default_definition(&self, executable: PathBuf) -> AgentDefinition {
        AgentDefinition {
            id: AgentId::new("claude"),
            provider: AgentProvider::ClaudeCode,
            display_name: "Claude Code".into(),
            executable,
            capabilities: [
                AgentCapability::Planning,
                AgentCapability::Coding,
                AgentCapability::Review,
                AgentCapability::Testing,
                AgentCapability::Documentation,
                AgentCapability::Research,
                AgentCapability::LongContext,
                AgentCapability::ToolUse,
            ]
            .into_iter()
            .collect(),
            input_mode: AgentInputMode::CliPrompt,
            traits: AgentTraits {
                resumable_sessions: true,
                streaming: true,
                structured_output: true,
                tool_use: true,
                headless: true,
            },
            // The default reviewer, because review is the job that most wants
            // a long context and the whole diff at once.
            role: AgentRole::Architect,
            extra_args: Vec::new(),
            enabled: true,
        }
    }

    fn command(&self, definition: &AgentDefinition, request: &AgentRunRequest) -> AgentCommand {
        let mut args = vec!["-p".to_string()];

        if request.unattended {
            // The farm has already decided what this agent may do — it is
            // running in a worktree of its own, under the farm's permissions.
            // Asking again through a terminal nobody is watching would hang.
            args.push("--permission-mode".into());
            args.push("acceptEdits".into());
        }

        args.extend(definition.extra_args.iter().cloned());
        args.push(request.prompt.clone());

        AgentCommand {
            program: definition.executable.clone(),
            args,
            stdin: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

    fn definition() -> AgentDefinition {
        ClaudeAdapter.default_definition(PathBuf::from("/usr/bin/claude"))
    }

    fn request(unattended: bool) -> AgentRunRequest {
        AgentRunRequest {
            workdir: PathBuf::from("/tmp/task-1"),
            prompt: "Do the thing".into(),
            unattended,
        }
    }

    #[test]
    fn the_prompt_is_the_last_argument() {
        let command = ClaudeAdapter.command(&definition(), &request(false));
        assert_eq!(command.args.first().unwrap(), "-p");
        assert_eq!(command.args.last().unwrap(), "Do the thing");
        assert_eq!(command.stdin, None);
    }

    #[test]
    fn an_unattended_run_does_not_stop_to_ask() {
        let command = ClaudeAdapter.command(&definition(), &request(true));
        assert!(command.args.iter().any(|arg| arg == "--permission-mode"));
    }

    #[test]
    fn an_attended_run_keeps_the_default_permissions() {
        let command = ClaudeAdapter.command(&definition(), &request(false));
        assert!(!command.args.iter().any(|arg| arg == "--permission-mode"));
    }

    #[test]
    fn extra_arguments_land_before_the_prompt() {
        // After the flags and before the positional, which is the only place
        // an added flag can go without being read as part of the prompt.
        let mut definition = definition();
        definition.extra_args = vec!["--model".into(), "opus".into()];
        let command = ClaudeAdapter.command(&definition, &request(false));
        let model = command.args.iter().position(|a| a == "--model").unwrap();
        assert!(model < command.args.len() - 1);
        assert_eq!(command.args.last().unwrap(), "Do the thing");
    }

    #[test]
    fn the_default_definition_can_review() {
        // The routing rule `Review -> Claude` depends on this.
        assert!(definition().capabilities.contains(&AgentCapability::Review));
        assert!(definition().traits.headless);
    }

    #[test]
    fn detection_looks_for_the_command_people_have() {
        assert_eq!(ClaudeAdapter.executables(), &["claude"]);
        assert!(ClaudeAdapter.is_headless(&definition()));
        assert_eq!(
            ClaudeAdapter
                .command(&definition(), &request(false))
                .program,
            Path::new("/usr/bin/claude")
        );
    }
}
