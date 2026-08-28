// SPDX-License-Identifier: GPL-3.0-or-later

//! The rebase worker: one thread, watching git rewrite history.
//!
//! # Why a worker at all
//!
//! Every other write command holds the session lock for as long as it runs.
//! That is fine for a commit and wrong for a rebase: replaying a hundred
//! commits takes long enough that the screen showing the progress could not ask
//! for it, because the command answering that question wants the same lock.
//!
//! So the rebase runs on a thread that took the repository path once, before
//! releasing the lock, and everything the screen learns arrives as an event.
//!
//! # Why progress is read rather than parsed
//!
//! git prints `Rebasing (3/7)` to stderr, and that string is localised and has
//! changed between versions. The same two numbers are in
//! `.git/rebase-merge/msgnum` and `end`, which is a format other tools already
//! depend on. [`spagitty_core::rebase::progress`] reads those, and this worker
//! polls it — one `read_to_string` of two tiny files, on a thread that would
//! otherwise be blocked on `wait()` anyway.
//!
//! # Nothing here kills the child
//!
//! A rebase stopped by a signal leaves a state directory that only
//! `git rebase --abort` knows how to unwind. There is no cancel on this worker
//! for that reason: stopping a rebase is Abort, which is a git command, not a
//! signal. A rebase interrupted by Spagitty exiting is left for the command
//! line to finish, which is the contract `shell.rs` is built around.

use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;
use std::time::Duration;

use serde::Serialize;
use spagitty_core::rebase::Progress;
use tauri::{AppHandle, Emitter, Runtime};

pub const PROGRESS_EVENT: &str = "rebase-progress";
pub const DONE_EVENT: &str = "rebase-done";

/// How often the state directory is read while the rebase runs.
///
/// Short enough that a fast rebase still shows movement, long enough that a
/// slow one is not two file reads a millisecond. A rebase step is rarely
/// quicker than this, so in practice no step goes unseen.
const POLL: Duration = Duration::from_millis(80);

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ProgressEvent {
    token: u64,
    #[serde(flatten)]
    step: Progress,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct DoneEvent {
    token: u64,
    /// The rebase ran to the end and the branch is where it was aiming.
    ok: bool,
    /// True when git stopped part-way and left a rebase in progress — a
    /// conflict, or an `edit` the user asked for. Not a failure: it is the
    /// hand-off, and the screen sends people to Conflicts on it.
    stopped: bool,
    /// git's own message, which is almost always better than anything we would
    /// write in its place.
    error: Option<String>,
}

/// A running rebase. Dropping this waits for it rather than stopping it.
pub struct RebaseWorker {
    handle: Option<JoinHandle<()>>,
}

impl Drop for RebaseWorker {
    fn drop(&mut self) {
        if let Some(handle) = self.handle.take() {
            let _ = handle.join();
        }
    }
}

/// Start the planned rebase and watch it.
///
/// `workdir` and `git_dir` are both taken by the caller while it still holds
/// the session lock, so this thread never needs it. Fails only if `git` could
/// not be started; everything after that arrives on [`DONE_EVENT`].
pub fn spawn<R: Runtime>(
    app: AppHandle<R>,
    workdir: PathBuf,
    git_dir: PathBuf,
    upstream: String,
    todo: String,
    token: u64,
) -> spagitty_core::Result<RebaseWorker> {
    let mut child = spagitty_core::shell::rebase_interactive_spawn(&workdir, &upstream, &todo)?;
    let stderr = child.stderr.take();

    let handle = std::thread::Builder::new()
        .name(format!("spagitty-rebase-{token}"))
        .spawn(move || {
            // Drained on its own thread. git writes progress and errors to the
            // same stream, and a rebase that fills the pipe with nobody reading
            // it deadlocks against our `wait()`.
            let said = Arc::new(Mutex::new(String::new()));
            let drain = stderr.map(|stderr| {
                let said = said.clone();
                std::thread::spawn(move || {
                    let mut text = String::new();
                    let _ = std::io::Read::read_to_string(&mut { stderr }, &mut text);
                    *said.lock().expect("rebase stderr lock") = text;
                })
            });

            let status = watch(&app, &git_dir, &mut child, token);
            if let Some(drain) = drain {
                let _ = drain.join();
            }

            report(
                &app,
                &git_dir,
                token,
                status,
                said.lock().expect("rebase stderr lock").clone(),
            );
        })
        .expect("spawning the rebase worker");

    Ok(RebaseWorker {
        handle: Some(handle),
    })
}

/// Poll the state directory until the child exits, emitting each new step.
fn watch<R: Runtime>(
    app: &AppHandle<R>,
    git_dir: &std::path::Path,
    child: &mut std::process::Child,
    token: u64,
) -> std::io::Result<std::process::ExitStatus> {
    let mut last: Option<Progress> = None;

    loop {
        if let Some(step) = spagitty_core::rebase::progress_in(git_dir) {
            // Only on a change: a rebase that sits on one commit for a minute
            // should not emit seven hundred identical events.
            if last.as_ref() != Some(&step) {
                let _ = app.emit(
                    PROGRESS_EVENT,
                    ProgressEvent {
                        token,
                        step: step.clone(),
                    },
                );
                last = Some(step);
            }
        }

        match child.try_wait() {
            Ok(Some(status)) => return Ok(status),
            Ok(None) => std::thread::sleep(POLL),
            Err(error) => return Err(error),
        }
    }
}

/// Say what happened, telling a stop apart from a failure.
fn report<R: Runtime>(
    app: &AppHandle<R>,
    git_dir: &std::path::Path,
    token: u64,
    status: std::io::Result<std::process::ExitStatus>,
    said: String,
) {
    // Asked of the repository, not inferred from the exit code. git exits
    // non-zero both for "I stopped, your turn" and for "this did not work", and
    // only the state directory tells them apart.
    let stopped = spagitty_core::rebase::progress_in(git_dir).is_some();

    let error = match &status {
        Ok(status) if status.success() => None,
        Ok(_) if stopped => None,
        Ok(status) => {
            Some(last_line(&said).unwrap_or_else(|| format!("git rebase failed ({status})")))
        }
        Err(error) => Some(error.to_string()),
    };

    let _ = app.emit(
        DONE_EVENT,
        DoneEvent {
            token,
            ok: error.is_none() && !stopped,
            stopped,
            error,
        },
    );
}

/// git's last non-empty line, which is almost always the reason it stopped.
fn last_line(said: &str) -> Option<String> {
    said.lines()
        .map(str::trim)
        .rfind(|line| !line.is_empty())
        .map(str::to_string)
}
