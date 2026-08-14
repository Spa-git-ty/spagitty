// SPDX-License-Identifier: GPL-3.0-or-later

//! Filesystem watching for the open repository.
//!
//! GitLord does not poll. `notify` watches the `.git` directory and the UI is
//! told when something it displays has actually changed — a branch moved, a
//! commit landed, the index was touched. Polling a repository means either
//! being slow to notice or burning CPU on a directory that is idle almost all
//! of the time.
//!
//! Only `.git` is watched, not the working tree. Everything the Graph screen
//! shows lives in there, and recursively watching a large checkout is exactly
//! the cost we are trying to avoid.

use std::path::Path;
use std::sync::mpsc::{channel, Receiver, RecvTimeoutError, Sender};
use std::thread::JoinHandle;
use std::time::Duration;

use notify::event::ModifyKind;
use notify::{EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use tauri::{AppHandle, Emitter};

pub const CHANGED_EVENT: &str = "repo-changed";

/// A single git operation touches several files in quick succession — a commit
/// rewrites the index, HEAD, a ref, and the reflog. Coalesce them so the UI
/// refreshes once, after things have settled, rather than four times mid-write.
const QUIET_PERIOD: Duration = Duration::from_millis(150);

#[derive(Serialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
struct ChangedEvent {
    /// A ref moved, or HEAD did: the graph's refs and the branch chip are stale.
    refs: bool,
    /// The index changed: working-copy counts are stale.
    worktree: bool,
}

impl ChangedEvent {
    fn is_empty(&self) -> bool {
        !self.refs && !self.worktree
    }
}

/// Holds the watcher alive. Dropping it stops watching and joins the thread.
pub struct RepoWatcher {
    _watcher: RecommendedWatcher,
    stop: Sender<()>,
    handle: Option<JoinHandle<()>>,
}

impl Drop for RepoWatcher {
    fn drop(&mut self) {
        let _ = self.stop.send(());
        if let Some(handle) = self.handle.take() {
            let _ = handle.join();
        }
    }
}

/// Start watching `git_dir`. Returns `None` if the platform watcher could not
/// be created — the app still works, it just won't notice outside changes,
/// which is better than refusing to open the repository.
pub fn watch(app: AppHandle, git_dir: &Path) -> Option<RepoWatcher> {
    let (event_tx, event_rx) = channel::<notify::Result<notify::Event>>();
    let (stop_tx, stop_rx) = channel::<()>();

    let mut watcher = notify::recommended_watcher(move |res| {
        // A closed receiver means the repository was closed; nothing to do.
        let _ = event_tx.send(res);
    })
    .ok()?;

    watcher.watch(git_dir, RecursiveMode::Recursive).ok()?;

    let handle = std::thread::Builder::new()
        .name("gitlord-watch".into())
        .spawn(move || debounce(app, event_rx, stop_rx))
        .ok()?;

    Some(RepoWatcher { _watcher: watcher, stop: stop_tx, handle: Some(handle) })
}

fn debounce(
    app: AppHandle,
    events: Receiver<notify::Result<notify::Event>>,
    stop: Receiver<()>,
) {
    loop {
        if stop.try_recv().is_ok() {
            return;
        }

        // Block until something happens, then keep collecting until the
        // repository goes quiet again.
        let mut pending = match events.recv_timeout(Duration::from_millis(250)) {
            Ok(Ok(event)) => classify(&event),
            Ok(Err(_)) => continue,
            Err(RecvTimeoutError::Timeout) => continue,
            Err(RecvTimeoutError::Disconnected) => return,
        };

        loop {
            match events.recv_timeout(QUIET_PERIOD) {
                Ok(Ok(event)) => {
                    let next = classify(&event);
                    pending.refs |= next.refs;
                    pending.worktree |= next.worktree;
                }
                Ok(Err(_)) => continue,
                Err(RecvTimeoutError::Timeout) => break,
                Err(RecvTimeoutError::Disconnected) => return,
            }
        }

        if !pending.is_empty() {
            let _ = app.emit(CHANGED_EVENT, pending);
        }
    }
}

/// Does this event mean something actually *changed*?
///
/// This filter is load-bearing, not an optimization. inotify reports reads as
/// `Access` events, and reading refs is exactly what the graph walk and every
/// snapshot do. Without this, reading refs would look like refs moving, which
/// would trigger a refresh, which would read refs again — a feedback loop that
/// reloads the graph forever.
///
/// Metadata-only modifications are excluded for the same reason: an atime bump
/// is not a ref moving. A ref that genuinely moves is written (`Modify(Data)`)
/// or replaced via a lock file and a rename (`Create` / `Modify(Name)`).
fn is_change(kind: &EventKind) -> bool {
    match kind {
        EventKind::Create(_) | EventKind::Remove(_) => true,
        EventKind::Modify(ModifyKind::Metadata(_)) => false,
        EventKind::Modify(_) => true,
        // Access, Any and Other carry no evidence that anything changed.
        _ => false,
    }
}

/// Work out what an event means for the UI.
///
/// Lock files are ignored: git writes `ref.lock` before `ref`, so reacting to
/// the lock would mean reading the repository exactly while it is mid-write.
fn classify(event: &notify::Event) -> ChangedEvent {
    let mut out = ChangedEvent::default();

    if !is_change(&event.kind) {
        return out;
    }

    for path in &event.paths {
        let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
        if name.ends_with(".lock") {
            continue;
        }

        let text = path.to_string_lossy();
        if text.contains("/refs/") || name == "HEAD" || name == "packed-refs" {
            out.refs = true;
        } else if name == "index" {
            out.worktree = true;
        }
    }

    out
}
