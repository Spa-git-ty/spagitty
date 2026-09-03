// SPDX-License-Identifier: GPL-3.0-or-later

//! An agent Spagitty has never heard of.
//!
//! The plan's list of future providers — Gemini CLI, Aider, OpenCode, Copilot
//! CLI, a local Ollama agent — is a list of releases if each one needs an
//! adapter. This is the alternative: the user names an executable and writes
//! the arguments, and `{prompt}` in any argument is replaced with the prompt.
//! An argument list with no placeholder gets the prompt on standard input,
//! because that is what a program with no prompt flag almost always accepts.
//!
//! It is deliberately not clever. There is no shell, no globbing and no
//! environment interpolation: arguments are passed to the process exactly as
//! written. A template that needed a shell to work would be a template that can
//! run anything, which is not something to put behind a text field.

use std::path::PathBuf;

use crate::agent::adapter::{AgentAdapter, AgentCommand, AgentRunRequest};
use crate::model::{
    AgentAvailability, AgentCapability, AgentDefinition, AgentId, AgentInputMode, AgentProvider,
    AgentRole, AgentTraits,
};

/// The token replaced with the prompt.
pub const PROMPT_TOKEN: &str = "{prompt}";

pub struct CustomAdapter;

impl AgentAdapter for CustomAdapter {
    fn provider(&self) -> AgentProvider {
        AgentProvider::Custom
    }

    /// Nothing to search for. A custom agent is added by hand, with a path the
    /// user supplies, so there is no name to look up on `PATH`.
    fn executables(&self) -> &'static [&'static str] {
        &[]
    }

    /// Never detected. It exists because somebody typed it in.
    fn detect(&self) -> AgentAvailability {
        AgentAvailability::Missing
    }

    fn default_definition(&self, executable: PathBuf) -> AgentDefinition {
        let name = executable
            .file_stem()
            .map(|stem| stem.to_string_lossy().into_owned())
            .unwrap_or_else(|| "Custom agent".to_string());
        AgentDefinition {
            id: AgentId::new(format!("custom-{name}")),
            provider: AgentProvider::Custom,
            display_name: name,
            executable,
            capabilities: [AgentCapability::Coding].into_iter().collect(),
            input_mode: AgentInputMode::Stdin,
            traits: AgentTraits {
                resumable_sessions: false,
                streaming: true,
                structured_output: false,
                tool_use: false,
                // Assumed, and asserted before the first run: an agent that
                // turns out to need a terminal fails on its first task with a
                // timeout rather than silently hanging forever.
                headless: true,
            },
            role: AgentRole::General,
            extra_args: Vec::new(),
            enabled: true,
        }
    }

    fn command(&self, definition: &AgentDefinition, request: &AgentRunRequest) -> AgentCommand {
        let templated = definition
            .extra_args
            .iter()
            .any(|arg| arg.contains(PROMPT_TOKEN));

        let args: Vec<String> = definition
            .extra_args
            .iter()
            .map(|arg| arg.replace(PROMPT_TOKEN, &request.prompt))
            .collect();

        AgentCommand {
            program: definition.executable.clone(),
            args,
            stdin: (!templated).then(|| request.prompt.clone()),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn definition(args: &[&str]) -> AgentDefinition {
        let mut definition = CustomAdapter.default_definition(PathBuf::from("/opt/aider/aider"));
        definition.extra_args = args.iter().map(|arg| arg.to_string()).collect();
        definition
    }

    fn request() -> AgentRunRequest {
        AgentRunRequest {
            workdir: PathBuf::from("/tmp/t"),
            prompt: "Fix the bug".into(),
            unattended: true,
        }
    }

    #[test]
    fn a_template_puts_the_prompt_where_it_is_asked_for() {
        let command = CustomAdapter.command(
            &definition(&["--yes", "--message", PROMPT_TOKEN]),
            &request(),
        );
        assert_eq!(command.args, ["--yes", "--message", "Fix the bug"]);
        assert_eq!(command.stdin, None);
    }

    #[test]
    fn the_token_is_replaced_inside_a_larger_argument() {
        let command = CustomAdapter.command(&definition(&["--task={prompt}"]), &request());
        assert_eq!(command.args, ["--task=Fix the bug"]);
    }

    #[test]
    fn no_template_means_the_prompt_goes_down_the_pipe() {
        let command = CustomAdapter.command(&definition(&["--quiet"]), &request());
        assert_eq!(command.args, ["--quiet"]);
        assert_eq!(command.stdin.as_deref(), Some("Fix the bug"));
    }

    #[test]
    fn the_name_comes_from_the_executable() {
        let definition = CustomAdapter.default_definition(PathBuf::from("/opt/aider/aider"));
        assert_eq!(definition.display_name, "aider");
        assert_eq!(definition.id, AgentId::new("custom-aider"));
    }

    #[test]
    fn a_custom_agent_is_never_found_by_detection() {
        assert!(CustomAdapter.executables().is_empty());
        assert_eq!(CustomAdapter.detect(), AgentAvailability::Missing);
    }

    #[test]
    fn arguments_are_passed_through_without_a_shell() {
        // A template that looks like shell is data, not code.
        let command =
            CustomAdapter.command(&definition(&["-c", "echo $HOME && {prompt}"]), &request());
        assert_eq!(command.args, ["-c", "echo $HOME && Fix the bug"]);
    }
}
