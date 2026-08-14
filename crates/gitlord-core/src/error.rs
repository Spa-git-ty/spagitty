// SPDX-License-Identifier: GPL-3.0-or-later

//! Error type for the core.
//!
//! Errors cross into JavaScript as plain strings, so the `Display` text is user
//! facing. Keep it in the same register as the rest of the UI: plain, specific,
//! no stack-trace jargon.

use std::path::PathBuf;

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("{0} is not a git repository")]
    NotARepository(PathBuf),

    #[error("no repository is open")]
    NoRepository,

    #[error("this repository has no commits yet")]
    EmptyRepository,

    #[error("could not read the repository: {0}")]
    Open(String),

    #[error("could not walk the history: {0}")]
    Walk(String),

    #[error("could not read refs: {0}")]
    Refs(String),

    #[error("could not diff: {0}")]
    Diff(String),

    #[error("no commit {0}")]
    UnknownCommit(String),

    /// A `git` subprocess failed. Carries git's own stderr, which is usually
    /// the most useful thing we can show.
    #[error("git {command} failed: {stderr}")]
    Git { command: String, stderr: String },

    #[error("{0}")]
    Io(#[from] std::io::Error),
}

impl serde::Serialize for Error {
    fn serialize<S: serde::Serializer>(&self, s: S) -> std::result::Result<S::Ok, S::Error> {
        s.serialize_str(&self.to_string())
    }
}
