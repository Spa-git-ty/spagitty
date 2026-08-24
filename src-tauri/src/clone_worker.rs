// SPDX-License-Identifier: GPL-3.0-or-later

//! The clone worker: one thread per clone.
//!
//! # Why this is not the search worker
//!
//! A search is cancelled by asking a loop to stop, because the loop is ours. A
//! clone is a `git` process, and the only way to stop one is to kill it — so
//! this worker owns a child rather than a flag, and cancellation is a signal
//! rather than a request.
//!
//! # Cancelling removes only what the clone created
//!
//! Whether the destination existed is decided *before* the process starts and
//! carried here. If it did, the directory is left exactly as it was found: the
//! partial contents of a cancelled clone inside a directory the user already
//! had is not something Spagitty may delete. If it did not, the directory is
//! removed — after the child is reaped, never after the kill signal, or the two
//! race and files reappear behind the removal.

use std::io::{BufReader, Read};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;

use spagitty_core::clone::{self, Progress};
use spagitty_core::shell;
use serde::Serialize;
use tauri::{AppHandle, Emitter};

pub const PROGRESS_EVENT: &str = "clone-progress";
pub const DONE_EVENT: &str = "clone-done";

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
    /// The repository is on disk and can be opened.
    ok: bool,
    /// False for a clone that failed on its own; true for one the user stopped.
    cancelled: bool,
    /// git's own message, which is almost always better than anything we would
    /// write in its place.
    error: Option<String>,
    /// Where it landed, so the caller opens the path it was promised rather
    /// than re-deriving it.
    path: PathBuf,
}

/// A running clone. Dropping this cancels it and waits for the thread.
pub struct CloneWorker {
    child: Arc<Mutex<std::process::Child>>,
    cancelled: Arc<AtomicBool>,
    handle: Option<JoinHandle<()>>,
}

impl CloneWorker {
    /// Stop the clone. The thread does the tidying up, once the child is dead.
    pub fn cancel(&self) {
        self.cancelled.store(true, Ordering::Relaxed);
        // A child that has already exited is not an error: the user pressed
        // cancel as it finished, which is a race rather than a failure.
        let _ = self.child.lock().expect("clone child lock").kill();
    }
}

impl Drop for CloneWorker {
    fn drop(&mut self) {
        self.cancel();
        if let Some(handle) = self.handle.take() {
            let _ = handle.join();
        }
    }
}

/// Start cloning `url` into `destination`.
///
/// Fails only if `git` could not be started at all. Everything after that —
/// a bad URL, a refused authentication, a network that is not there — arrives
/// on [`DONE_EVENT`] with git's own message.
pub fn spawn(
    app: AppHandle,
    url: String,
    destination: PathBuf,
    remove_on_cancel: bool,
    token: u64,
) -> spagitty_core::Result<CloneWorker> {
    let mut child = shell::clone_start(&url, &destination)?;
    let stderr = child.stderr.take();

    let child = Arc::new(Mutex::new(child));
    let cancelled = Arc::new(AtomicBool::new(false));

    let handle = std::thread::Builder::new()
        .name(format!("spagitty-clone-{token}"))
        .spawn({
            let child = child.clone();
            let cancelled = cancelled.clone();
            move || {
                let last = stderr.and_then(|stderr| report(&app, token, stderr));
                finish(
                    &app,
                    token,
                    &child,
                    &cancelled,
                    &destination,
                    remove_on_cancel,
                    last,
                );
            }
        })
        .expect("spawning the clone worker");

    Ok(CloneWorker {
        child,
        cancelled,
        handle: Some(handle),
    })
}

/// Forward git's progress until it stops talking, and return the last thing it
/// said.
///
/// That last line is how a failure gets git's own words: stderr is both the
/// progress channel and the error channel, and it is read here, so nothing else
/// can read it afterwards.
///
/// `git` terminates a progress update with a carriage return rather than a
/// newline — it is rewriting one line on a terminal — so both count as the end
/// of a line here. Reading a byte at a time is through a `BufReader`, so it is
/// a buffer index rather than a syscall.
fn report(app: &AppHandle, token: u64, stderr: std::process::ChildStderr) -> Option<String> {
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

/// Reap the child, tidy up if it was cancelled, and say what happened.
fn finish(
    app: &AppHandle,
    token: u64,
    child: &Mutex<std::process::Child>,
    cancelled: &AtomicBool,
    destination: &Path,
    remove_on_cancel: bool,
    last: Option<String>,
) {
    let status = child.lock().expect("clone child lock").wait();
    let stopped = cancelled.load(Ordering::Relaxed);

    // Only after the child is reaped: a killed `git clone` that is still
    // running would write files back into a directory being removed.
    if stopped && remove_on_cancel {
        let _ = std::fs::remove_dir_all(destination);
    }

    let error = match &status {
        Ok(status) if status.success() => None,
        Ok(_) if stopped => Some("The clone was stopped.".to_string()),
        // git's last words, which are almost always the reason. Falling back to
        // the exit status only when it said nothing at all.
        Ok(status) => Some(last.unwrap_or_else(|| format!("git clone failed ({status})"))),
        Err(error) => Some(error.to_string()),
    };

    let _ = app.emit(
        DONE_EVENT,
        DoneEvent {
            token,
            ok: error.is_none(),
            cancelled: stopped,
            error,
            path: destination.to_path_buf(),
        },
    );
}
