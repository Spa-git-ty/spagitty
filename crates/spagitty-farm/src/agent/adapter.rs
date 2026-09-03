// SPDX-License-Identifier: GPL-3.0-or-later

//! The one interface every provider implements.
//!
//! # Why this trait is synchronous
//!
//! The plan writes it `#[async_trait]`. Spagitty is not an async program:
//! `spagitty-core` is blocking throughout, the workers in `src-tauri` are OS
//! threads, and there is no runtime anywhere in the workspace. Making one trait
//! async would pull tokio into a desktop application whose concurrency is
//! "a handful of long-lived child processes", and every caller would then be
//! async too. So the trait blocks, the runner puts it on a thread, and
//! cancellation is a kill signal rather than a dropped future — which is what
//! it has to be anyway, because these are processes and not tasks.
//!
//! # What an adapter is allowed to know
//!
//! An adapter knows one provider's command line and nothing else. It does not
//! know about worktrees, dependencies, verification or review: it is handed a
//! working directory and a prompt, and it produces a command to run. That is
//! the whole boundary, and it is what keeps provider-specific strings out of
//! the engine.

use std::path::{Path, PathBuf};

use crate::model::{AgentAvailability, AgentDefinition, AgentProvider};

/// What the runner needs to start one agent.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AgentRunRequest {
    /// The worktree the agent runs in. Always the task's own; never the
    /// repository the user is looking at.
    pub workdir: PathBuf,
    /// The whole prompt, already assembled by the context builder.
    pub prompt: String,
    /// Whether the farm's permissions allow the agent to act without asking.
    /// Adapters map this onto whatever their provider calls it.
    pub unattended: bool,
}

/// The command line an adapter wants run, and how the prompt reaches it.
///
/// A plain description rather than a spawned process: the adapter decides
/// *what* to run and [`crate::execution`] decides *how*, so one place owns
/// stream capture, cancellation and logging for every provider.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AgentCommand {
    pub program: PathBuf,
    pub args: Vec<String>,
    /// `Some` when the prompt goes to standard input rather than an argument.
    pub stdin: Option<String>,
}

impl AgentCommand {
    /// The command as one line, for the activity log.
    ///
    /// Arguments containing spaces are quoted so the line can be pasted into a
    /// shell and reproduce the run. That is the point of showing it at all —
    /// the same reasoning as `spagitty_core::record` for git commands.
    pub fn display(&self) -> String {
        let mut out = quoted(&self.program.to_string_lossy());
        for arg in &self.args {
            out.push(' ');
            out.push_str(&quoted(arg));
        }
        out
    }
}

fn quoted(value: &str) -> String {
    if value.is_empty() {
        return "''".to_string();
    }
    if value
        .chars()
        .all(|c| c.is_alphanumeric() || "._-/=:@+,".contains(c))
    {
        return value.to_string();
    }
    format!("'{}'", value.replace('\'', r"'\''"))
}

/// One provider.
pub trait AgentAdapter: Send + Sync {
    fn provider(&self) -> AgentProvider;

    /// The command names to look for on `PATH`, most specific first.
    fn executables(&self) -> &'static [&'static str];

    /// A definition with this provider's defaults, for a freshly detected
    /// agent. The user edits it afterwards; nothing here is permanent.
    fn default_definition(&self, executable: PathBuf) -> AgentDefinition;

    /// Is it installed, and does it run?
    ///
    /// The default walks `PATH` and asks for a version. A provider that cannot
    /// answer `--version` overrides it rather than being reported broken.
    fn detect(&self) -> AgentAvailability {
        match super::detector::find(self.executables()) {
            Some(path) => super::detector::probe(&path, self.version_args()),
            None => AgentAvailability::Missing,
        }
    }

    /// The arguments that make this provider print its version and exit.
    fn version_args(&self) -> &'static [&'static str] {
        &["--version"]
    }

    /// Build the command line for one run.
    fn command(&self, definition: &AgentDefinition, request: &AgentRunRequest) -> AgentCommand;

    /// Does this provider need a terminal?
    ///
    /// Asked before a run rather than discovered during one: an agent that
    /// opens an interactive session with no tty attached hangs, and a hung
    /// child looks exactly like a slow one until somebody notices an hour
    /// later.
    fn is_headless(&self, definition: &AgentDefinition) -> bool {
        definition.traits.headless
    }
}

/// Where the adapter should run, given a worktree.
///
/// Trivial today, and here so that a provider needing a subdirectory — a
/// monorepo tool, say — has somewhere to say so rather than every call site
/// growing a special case.
pub fn workdir_for(worktree: &Path) -> PathBuf {
    worktree.to_path_buf()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_plain_command_displays_unquoted() {
        let command = AgentCommand {
            program: PathBuf::from("/usr/bin/claude"),
            args: vec!["-p".into(), "--permission-mode=plan".into()],
            stdin: None,
        };
        assert_eq!(
            command.display(),
            "/usr/bin/claude -p --permission-mode=plan"
        );
    }

    #[test]
    fn an_argument_with_spaces_is_quoted_so_the_line_can_be_pasted() {
        let command = AgentCommand {
            program: PathBuf::from("codex"),
            args: vec!["exec".into(), "Implement refresh rotation".into()],
            stdin: None,
        };
        assert_eq!(command.display(), "codex exec 'Implement refresh rotation'");
    }

    #[test]
    fn a_quote_inside_an_argument_survives_the_quoting() {
        let command = AgentCommand {
            program: PathBuf::from("codex"),
            args: vec!["it's fine".into()],
            stdin: None,
        };
        assert_eq!(command.display(), r"codex 'it'\''s fine'");
    }

    #[test]
    fn an_empty_argument_is_visible_rather_than_lost() {
        let command = AgentCommand {
            program: PathBuf::from("x"),
            args: vec![String::new()],
            stdin: None,
        };
        assert_eq!(command.display(), "x ''");
    }
}
