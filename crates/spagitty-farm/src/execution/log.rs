// SPDX-License-Identifier: GPL-3.0-or-later

//! The transcript of one agent run, on disk.
//!
//! # Why this is a file and not a `String` in memory
//!
//! An agent run produces as much output as it likes. A model reading a large
//! repository and narrating what it finds can produce several megabytes in a
//! few minutes, and a farm holding four of those in memory — plus the events it
//! has already sent to the webview — is a farm that grows until it is killed.
//!
//! So the transcript goes to a file as it arrives, and the UI reads a bounded
//! tail. The file is also what makes [`crate::model::Handoff::parse`] work after
//! a restart: the handoff block is in the transcript, and the transcript
//! outlives the process that produced it.
//!
//! # Where
//!
//! ```text
//! <repo>/.spagitty/farm/logs/<task>/<run>.log
//! ```
//!
//! Beside the worktrees, under the same excluded directory, so a farm's whole
//! footprint is one directory the user can delete.

use std::io::{Read, Seek, SeekFrom, Write};
use std::path::{Path, PathBuf};

use crate::error::Result;
use crate::model::{RunId, TaskId};
use crate::workspace::worktree::FARM_DIR;

/// How much of a transcript the UI is given.
///
/// A quarter of a megabyte: enough to hold the end of a long run including its
/// handoff block, small enough that sending it over the Tauri bridge is not
/// something the user notices.
pub const TAIL_BYTES: u64 = 256 * 1024;

/// Where a run's transcript lives.
pub fn log_path(repo: &Path, task: &TaskId, run: &RunId) -> PathBuf {
    repo.join(FARM_DIR)
        .join("farm")
        .join("logs")
        .join(crate::workspace::branch::worktree_dir(task))
        .join(format!("{}.log", sanitise(run.as_str())))
}

/// An open transcript, appended to as the agent talks.
pub struct TranscriptWriter {
    file: std::fs::File,
    path: PathBuf,
}

impl TranscriptWriter {
    pub fn create(path: &Path) -> Result<Self> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let file = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(path)?;
        Ok(TranscriptWriter {
            file,
            path: path.to_path_buf(),
        })
    }

    /// Append one line.
    ///
    /// Flushed on every line rather than buffered, because the file is what a
    /// person reads when they want to know why an agent is taking so long, and
    /// a buffered transcript is empty for exactly as long as the question is
    /// interesting. Agent output arrives at human speed; the syscall is free at
    /// that rate.
    pub fn line(&mut self, text: &str) {
        let _ = writeln!(self.file, "{text}");
        let _ = self.file.flush();
    }

    pub fn path(&self) -> &Path {
        &self.path
    }
}

/// The last [`TAIL_BYTES`] of a transcript.
///
/// A missing file reads as empty rather than as an error: a run that failed
/// before it wrote anything has no transcript, and the screen should say
/// "nothing yet" rather than show a failure about a log file.
pub fn tail(path: &Path) -> String {
    let Ok(mut file) = std::fs::File::open(path) else {
        return String::new();
    };
    let length = file.metadata().map(|meta| meta.len()).unwrap_or(0);
    let from = length.saturating_sub(TAIL_BYTES);
    if file.seek(SeekFrom::Start(from)).is_err() {
        return String::new();
    }
    let mut bytes = Vec::new();
    if file.read_to_end(&mut bytes).is_err() {
        return String::new();
    }
    let text = String::from_utf8_lossy(&bytes).into_owned();
    if from == 0 {
        return text;
    }
    // The cut lands mid-line and mid-character. Dropping to the first newline
    // gives back whole lines, and `from_utf8_lossy` has already replaced the
    // broken character before it.
    match text.find('\n') {
        Some(index) => text[index + 1..].to_string(),
        None => text,
    }
}

/// The whole transcript, for parsing a handoff out of.
pub fn read(path: &Path) -> String {
    std::fs::read_to_string(path).unwrap_or_default()
}

/// A run identifier as a filename.
fn sanitise(value: &str) -> String {
    value
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '-' {
                c
            } else {
                '-'
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_transcript_lands_under_the_farm_directory() {
        let path = log_path(
            Path::new("/repo"),
            &TaskId::new("TASK-0042"),
            &RunId::new("run-1"),
        );
        assert!(path.ends_with(".spagitty/farm/logs/task-0042/run-1.log"));
    }

    #[test]
    fn a_run_identifier_cannot_escape_the_log_directory() {
        let path = log_path(
            Path::new("/repo"),
            &TaskId::new("TASK-0001"),
            &RunId::new("../../etc/passwd"),
        );
        assert!(
            path.ends_with("logs/task-0001/------etc-passwd.log"),
            "{path:?}"
        );
    }

    #[test]
    fn lines_are_readable_before_the_run_ends() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("nested").join("run.log");
        let mut writer = TranscriptWriter::create(&path).unwrap();
        writer.line("reading files");
        // No close, no drop: this is the state the UI reads in.
        assert_eq!(read(&path), "reading files\n");
        writer.line("editing src/auth.rs");
        assert_eq!(tail(&path), "reading files\nediting src/auth.rs\n");
    }

    #[test]
    fn a_missing_transcript_reads_as_nothing() {
        assert_eq!(tail(Path::new("/nonexistent/run.log")), "");
        assert_eq!(read(Path::new("/nonexistent/run.log")), "");
    }

    #[test]
    fn a_long_transcript_is_cut_to_whole_lines() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("run.log");
        let mut writer = TranscriptWriter::create(&path).unwrap();
        for index in 0..40_000 {
            writer.line(&format!("line {index} of the agent's narration"));
        }

        let tail = tail(&path);
        assert!((tail.len() as u64) <= TAIL_BYTES);
        // Whole lines only: a UI that renders a half-line looks broken.
        assert!(
            tail.starts_with("line "),
            "{:?}",
            &tail[..40.min(tail.len())]
        );
        assert!(tail.ends_with("narration\n"));
        // The end is what matters — the handoff block lives there.
        assert!(tail.contains("line 39999 "));
    }

    #[test]
    fn a_short_transcript_is_returned_whole() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("run.log");
        let mut writer = TranscriptWriter::create(&path).unwrap();
        writer.line("first");
        writer.line("second");
        assert_eq!(tail(&path), "first\nsecond\n");
    }

    #[test]
    fn appending_to_an_existing_transcript_does_not_truncate_it() {
        // A resumed session must not lose what the first attempt said.
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("run.log");
        TranscriptWriter::create(&path).unwrap().line("first run");
        TranscriptWriter::create(&path).unwrap().line("second run");
        assert_eq!(read(&path), "first run\nsecond run\n");
    }
}
