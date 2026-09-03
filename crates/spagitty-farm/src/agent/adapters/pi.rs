// SPDX-License-Identifier: GPL-3.0-or-later

//! Oh My Pi.
//!
//! # Why this one takes its prompt on standard input
//!
//! The other three published a documented non-interactive flag before this was
//! written; this one is driven the way any well-behaved Unix program can be
//! driven — the prompt on standard input, the transcript on standard output.
//! That is the lowest common denominator, it needs no knowledge of a flag set
//! that may change, and it is the mode that keeps working if the command line
//! is reorganised.
//!
//! The cost is that a provider which *would* have accepted a prompt argument
//! now gets a pipe. That is a fair trade for not guessing at flags, and a user
//! who knows better can add them: `extra_args` is appended here as it is
//! everywhere, and the input mode is a field on the definition rather than a
//! constant, so switching this agent to `CliPrompt` is a settings change.

use std::path::PathBuf;

use crate::agent::adapter::{AgentAdapter, AgentCommand, AgentRunRequest};
use crate::model::{
    AgentCapability, AgentDefinition, AgentId, AgentInputMode, AgentProvider, AgentRole,
    AgentTraits,
};

pub struct PiAdapter;

impl AgentAdapter for PiAdapter {
    fn provider(&self) -> AgentProvider {
        AgentProvider::OhMyPi
    }

    fn executables(&self) -> &'static [&'static str] {
        &["pi", "ohmypi"]
    }

    fn default_definition(&self, executable: PathBuf) -> AgentDefinition {
        AgentDefinition {
            id: AgentId::new("pi"),
            provider: AgentProvider::OhMyPi,
            display_name: "Oh My Pi".into(),
            executable,
            capabilities: [
                AgentCapability::Coding,
                AgentCapability::Research,
                AgentCapability::Documentation,
            ]
            .into_iter()
            .collect(),
            input_mode: AgentInputMode::Stdin,
            traits: AgentTraits {
                resumable_sessions: false,
                streaming: true,
                structured_output: false,
                tool_use: true,
                headless: true,
            },
            role: AgentRole::General,
            extra_args: Vec::new(),
            enabled: true,
        }
    }

    fn command(&self, definition: &AgentDefinition, request: &AgentRunRequest) -> AgentCommand {
        // The definition decides, not this function: a user who has switched
        // the input mode gets what they asked for rather than what this
        // provider shipped with.
        let on_stdin = definition.input_mode == AgentInputMode::Stdin;
        let mut args = definition.extra_args.clone();
        if !on_stdin {
            args.push(request.prompt.clone());
        }

        AgentCommand {
            program: definition.executable.clone(),
            args,
            stdin: on_stdin.then(|| request.prompt.clone()),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn definition() -> AgentDefinition {
        PiAdapter.default_definition(PathBuf::from("pi"))
    }

    fn request() -> AgentRunRequest {
        AgentRunRequest {
            workdir: PathBuf::from("/tmp/t"),
            prompt: "Write the docs".into(),
            unattended: true,
        }
    }

    #[test]
    fn the_prompt_goes_down_the_pipe_by_default() {
        let command = PiAdapter.command(&definition(), &request());
        assert_eq!(command.stdin.as_deref(), Some("Write the docs"));
        assert!(command.args.is_empty());
    }

    #[test]
    fn switching_the_input_mode_moves_the_prompt_to_the_command_line() {
        let mut definition = definition();
        definition.input_mode = AgentInputMode::CliPrompt;
        let command = PiAdapter.command(&definition, &request());
        assert_eq!(command.stdin, None);
        assert_eq!(command.args.last().unwrap(), "Write the docs");
    }

    #[test]
    fn both_names_are_searched() {
        assert_eq!(PiAdapter.executables(), &["pi", "ohmypi"]);
    }
}
