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

    Some(RepoWatcher {
        _watcher: watcher,
        stop: stop_tx,
        handle: Some(handle),
    })
}

fn debounce(app: AppHandle, events: Receiver<notify::Result<notify::Event>>, stop: Receiver<()>) {
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

#[cfg(test)]
mod tests {
    use super::*;
    use notify::event::{CreateKind, DataChange, MetadataKind, RemoveKind};
    use std::path::PathBuf;

    fn event(kind: EventKind, paths: &[&str]) -> notify::Event {
        notify::Event {
            kind,
            paths: paths.iter().map(PathBuf::from).collect(),
            attrs: Default::default(),
        }
    }

    const WROTE: EventKind = EventKind::Modify(ModifyKind::Data(DataChange::Any));

    #[test]
    fn a_read_is_not_a_change() {
        // This is the whole reason the filter exists. inotify reports reads as
        // Access events, and reading refs is what the graph walk does; treating
        // one as a change would reload the graph forever.
        let read = event(
            EventKind::Access(notify::event::AccessKind::Read),
            &[".git/refs/heads/main"],
        );

        assert!(!is_change(&read.kind));
        assert!(classify(&read).is_empty());
    }

    #[test]
    fn an_atime_bump_is_not_a_ref_moving() {
        let touched = event(
            EventKind::Modify(ModifyKind::Metadata(MetadataKind::AccessTime)),
            &[".git/refs/heads/main"],
        );

        assert!(!is_change(&touched.kind));
        assert!(classify(&touched).is_empty());
    }

    #[test]
    fn a_written_ref_is_a_ref_change() {
        let written = event(WROTE, &[".git/refs/heads/main"]);

        let out = classify(&written);
        assert!(out.refs);
        assert!(!out.worktree);
    }

    #[test]
    fn a_ref_replaced_through_a_rename_is_a_ref_change() {
        // git writes `ref.lock` and renames it over `ref`, so the change arrives
        // as a create or a rename rather than a data write.
        let created = event(
            EventKind::Create(CreateKind::File),
            &[".git/refs/heads/main"],
        );
        let renamed = event(
            EventKind::Modify(ModifyKind::Name(notify::event::RenameMode::To)),
            &[".git/refs/heads/main"],
        );

        assert!(classify(&created).refs);
        assert!(classify(&renamed).refs);
    }

    #[test]
    fn a_deleted_branch_is_a_ref_change() {
        let removed = event(
            EventKind::Remove(RemoveKind::File),
            &[".git/refs/heads/gone"],
        );
        assert!(classify(&removed).refs);
    }

    #[test]
    fn head_and_packed_refs_count_as_refs() {
        assert!(classify(&event(WROTE, &[".git/HEAD"])).refs);
        assert!(classify(&event(WROTE, &[".git/packed-refs"])).refs);
    }

    #[test]
    fn the_index_is_a_worktree_change_and_not_a_ref_change() {
        let out = classify(&event(WROTE, &[".git/index"]));

        assert!(out.worktree);
        assert!(!out.refs);
    }

    #[test]
    fn a_lock_file_is_ignored_so_we_never_read_mid_write() {
        let lock = event(
            EventKind::Create(CreateKind::File),
            &[".git/refs/heads/main.lock"],
        );
        let index_lock = event(WROTE, &[".git/index.lock"]);

        assert!(classify(&lock).is_empty());
        assert!(classify(&index_lock).is_empty());
    }

    #[test]
    fn an_unrelated_file_inside_the_git_directory_changes_nothing() {
        assert!(classify(&event(WROTE, &[".git/COMMIT_EDITMSG"])).is_empty());
        assert!(classify(&event(WROTE, &[".git/objects/ab/cdef"])).is_empty());
    }

    #[test]
    fn one_event_touching_both_reports_both() {
        // A commit rewrites the index and moves a ref; the debounce coalesces
        // them, so a single event carrying both paths has to as well.
        let both = event(WROTE, &[".git/index", ".git/refs/heads/main"]);

        let out = classify(&both);
        assert!(out.refs);
        assert!(out.worktree);
        assert!(!out.is_empty());
    }

    #[test]
    fn an_event_with_no_paths_changes_nothing() {
        assert!(classify(&event(WROTE, &[])).is_empty());
    }

    // `watch` itself, the debounce loop and the graph worker all take an
    // `AppHandle`, which is bound to the Wry runtime here. Testing them means
    // making this crate generic over `tauri::Runtime` so `mock_app` can supply
    // its own — a signature change across the whole Tauri layer, recorded as
    // TASK-003 rather than smuggled into a testing item.
}
