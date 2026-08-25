// SPDX-License-Identifier: GPL-3.0-or-later

//! Fetch and push, watched while they run (FEAT-018).
//!
//! # Why a worker
//!
//! Both were blocking commands: `--progress` was passed and nothing read it, so
//! git's output arrived all at once when the process ended. On a large fetch
//! that is a UI that says nothing for a minute and then says everything, which
//! is indistinguishable from a UI that has hung.
//!
//! The same reason as the rebase worker applies too: a blocking command holds
//! the session lock, so nothing else can ask the repository anything while a
//! slow network operation runs.
//!
//! # Why it is not the clone worker
//!
//! A clone is cancellable, owns a destination directory it may have to remove,
//! and produces a repository rather than changing one. Fetch and push change a
//! repository that is already open, and neither is cancelled — killing a push
//! mid-transfer is not something with a defined outcome, and a fetch that is
//! interrupted simply leaves the refs it had already written.
//!
//! What *is* shared is the progress parsing: `git fetch --progress` and
//! `git push --progress` write the same `phase: 42% (…)` lines a clone does, so
//! [`spagitty_core::clone::progress`] reads all three.

use std::path::PathBuf;
use std::thread::JoinHandle;

use serde::{Deserialize, Serialize};
use spagitty_core::clone::{self, Progress};
use spagitty_core::shell;
use tauri::{AppHandle, Emitter, Runtime};

pub const PROGRESS_EVENT: &str = "network-progress";
pub const DONE_EVENT: &str = "network-done";

/// Which operation a worker is running, so one screen can label both.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Operation {
    Fetch,
    Push,
}

impl Operation {
    fn label(self) -> &'static str {
        match self {
            Operation::Fetch => "fetch",
            Operation::Push => "push",
        }
    }
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ProgressEvent {
    token: u64,
    operation: Operation,
    #[serde(flatten)]
    step: Progress,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct DoneEvent {
    token: u64,
    operation: Operation,
    ok: bool,
    /// git's own message, which for a refused push or a missing credential is
    /// the entire useful content of the failure.
    error: Option<String>,
    /// git's last words on success — "Everything up-to-date", a ref update
    /// summary — so a fetch that brought nothing can say so.
    summary: Option<String>,
}

/// A running fetch or push. Dropping it waits rather than stopping it.
pub struct NetworkWorker {
    handle: Option<JoinHandle<()>>,
}

impl Drop for NetworkWorker {
    fn drop(&mut self) {
        if let Some(handle) = self.handle.take() {
            let _ = handle.join();
        }
    }
}

/// What to run. Built by the command while it holds the session lock.
pub enum Job {
    Fetch {
        remote: String,
        prune: bool,
    },
    Push {
        remote: String,
        refspec: String,
        force: bool,
    },
}

impl Job {
    fn operation(&self) -> Operation {
        match self {
            Job::Fetch { .. } => Operation::Fetch,
            Job::Push { .. } => Operation::Push,
        }
    }

    fn start(&self, workdir: &std::path::Path) -> spagitty_core::Result<std::process::Child> {
        match self {
            Job::Fetch { remote, prune } => shell::fetch_spawn(workdir, remote, *prune),
            Job::Push {
                remote,
                refspec,
                force,
            } => shell::push_spawn(workdir, remote, refspec, *force),
        }
    }
}

/// Start the job and forward what git says about it.
///
/// Fails only if `git` could not be started; everything after that arrives on
/// [`DONE_EVENT`].
pub fn spawn<R: Runtime>(
    app: AppHandle<R>,
    workdir: PathBuf,
    job: Job,
    token: u64,
) -> spagitty_core::Result<NetworkWorker> {
    let operation = job.operation();
    let mut child = job.start(&workdir)?;
    let stderr = child.stderr.take();

    let handle = std::thread::Builder::new()
        .name(format!("spagitty-{}-{token}", operation.label()))
        .spawn(move || {
            let last = stderr.and_then(|stderr| report(&app, token, operation, stderr));
            let status = child.wait();

            let error = match &status {
                Ok(status) if status.success() => None,
                // git's last words. For a rejected push or a missing credential
                // they are the whole of the useful content.
                Ok(status) => Some(
                    last.clone()
                        .unwrap_or_else(|| format!("git {} failed ({status})", operation.label())),
                ),
                Err(error) => Some(error.to_string()),
            };

            let _ = app.emit(
                DONE_EVENT,
                DoneEvent {
                    token,
                    operation,
                    ok: error.is_none(),
                    summary: if error.is_none() { last } else { None },
                    error,
                },
            );
        })
        .expect("spawning the network worker");

    Ok(NetworkWorker {
        handle: Some(handle),
    })
}

/// Forward git's progress until it stops talking, and return the last thing it
/// said.
///
/// The same shape as the clone worker's, and for the same reason: git ends a
/// progress update with a carriage return rather than a newline, because it is
/// rewriting one line on a terminal, so both count as the end of a line.
fn report<R: Runtime>(
    app: &AppHandle<R>,
    token: u64,
    operation: Operation,
    stderr: std::process::ChildStderr,
) -> Option<String> {
    use std::io::{BufReader, Read};

    let mut reader = BufReader::new(stderr);
    let mut line: Vec<u8> = Vec::new();
    let mut byte = [0u8; 1];
    let mut last: Option<Progress> = None;

    let flush = |line: &mut Vec<u8>, last: &mut Option<Progress>| {
        let text = String::from_utf8_lossy(line).into_owned();
        line.clear();

        let Some(step) = clone::progress(&text) else {
            return;
        };
        if clone::is_new_step(last.as_ref(), &step) {
            let _ = app.emit(
                PROGRESS_EVENT,
                ProgressEvent {
                    token,
                    operation,
                    step: step.clone(),
                },
            );
        }
        *last = Some(step);
    };

    while reader.read(&mut byte).unwrap_or(0) == 1 {
        match byte[0] {
            b'\r' | b'\n' => flush(&mut line, &mut last),
            other => line.push(other),
        }
    }
    flush(&mut line, &mut last);

    last.map(|step| step.line)
}
