// SPDX-License-Identifier: GPL-3.0-or-later

//! Tauri commands. This layer is deliberately thin: it holds the open session,
//! forwards to `gitlord-core`, and converts errors to strings for the webview.
//! No git logic lives here.

use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;

use gitlord_core::diff::{self, CommitDetail, CommitDiff, FileDiff};
use gitlord_core::graph::ROW_PITCH;
use gitlord_core::refs::RefIndex;
use gitlord_core::repo::{self, RepoInfo};
use gitlord_core::status::{self, RepoCounts};
use gitlord_core::{Error, Result};
use serde::Serialize;
use tauri::{AppHandle, Manager, State};

use crate::graph_worker::{self, GraphWorker};
use crate::watch::{self, RepoWatcher};

/// One open repository and everything running against it.
///
/// Field order matters on drop: the graph worker and the watcher both hold an
/// `AppHandle` and must be shut down before the repository handle goes away.
struct Session {
    path: PathBuf,
    repo: gitlord_core::gix::ThreadSafeRepository,
    graph: GraphWorker,
    _watcher: Option<RepoWatcher>,
}

#[derive(Default)]
pub struct AppState {
    session: Mutex<Option<Session>>,
    next_token: AtomicU64,
}

impl AppState {
    fn with_session<T>(&self, f: impl FnOnce(&Session) -> Result<T>) -> Result<T> {
        let guard = self.session.lock().expect("session lock");
        let session = guard.as_ref().ok_or(Error::NoRepository)?;
        f(session)
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenResult {
    pub info: RepoInfo,
    pub counts: RepoCounts,
    /// Identifies this walk. Rows from any other token are stale and dropped.
    pub token: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    pub info: RepoInfo,
    pub counts: RepoCounts,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Metrics {
    /// Mirrored by ROW_PITCH in src/lib/metrics.ts. The frontend asserts these
    /// agree at boot, so the two definitions cannot silently drift apart.
    pub row_pitch: u32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct About {
    pub version: &'static str,
    /// The commit this binary was built from, for the GPL-3 "corresponding
    /// source" obligation.
    pub commit: &'static str,
    pub license: &'static str,
}

/// Open a repository (or the one containing `path`) and start its graph worker.
///
/// Opening does not walk anything. The worker waits for the first
/// [`graph_request`] before it touches history.
#[tauri::command]
pub fn open_repo(app: AppHandle, state: State<'_, AppState>, path: PathBuf) -> Result<OpenResult> {
    let sync = repo::open_sync(&path)?;
    let local = sync.to_thread_local();

    let info = repo::info(&local)?;
    let refs = RefIndex::build(&local)?;
    let counts = status::counts(&local, &refs)?;
    let git_dir = local.git_dir().to_path_buf();

    let token = state.next_token.fetch_add(1, Ordering::Relaxed);
    let graph = graph_worker::spawn(app.clone(), info.path.clone(), token);
    let watcher = watch::watch(app, &git_dir);

    // Replacing the session drops the previous worker and watcher, which joins
    // their threads before we return.
    *state.session.lock().expect("session lock") = Some(Session {
        path: info.path.clone(),
        repo: sync,
        graph,
        _watcher: watcher,
    });

    Ok(OpenResult { info, counts, token })
}

/// Ask the walker for `count` more rows. Returns immediately; rows arrive on
/// the `graph-rows` event.
#[tauri::command]
pub fn graph_request(state: State<'_, AppState>, token: u64, count: usize) -> Result<()> {
    state.with_session(|session| {
        // A request against a walk that has been replaced is stale, not an
        // error — it just raced a refresh.
        if session.graph.token() == token {
            session.graph.request(count);
        }
        Ok(())
    })
}

/// Restart the walk after refs moved. Produces a new token; the UI clears its
/// rows and starts again.
#[tauri::command]
pub fn graph_restart(app: AppHandle, state: State<'_, AppState>) -> Result<u64> {
    let mut guard = state.session.lock().expect("session lock");
    let session = guard.as_mut().ok_or(Error::NoRepository)?;

    let token = state.next_token.fetch_add(1, Ordering::Relaxed);
    session.graph = graph_worker::spawn(app, session.path.clone(), token);
    Ok(token)
}

/// HEAD and the rail counts, re-read. Called after `repo-changed`.
#[tauri::command]
pub fn snapshot(state: State<'_, AppState>) -> Result<Snapshot> {
    state.with_session(|session| {
        let local = session.repo.to_thread_local();
        let refs = RefIndex::build(&local)?;
        Ok(Snapshot {
            info: repo::info(&local)?,
            counts: status::counts(&local, &refs)?,
        })
    })
}

/// Everything the detail panel shows for one commit.
#[tauri::command]
pub fn commit_detail(state: State<'_, AppState>, id: String) -> Result<CommitDetail> {
    state.with_session(|session| diff::commit_detail(&session.repo.to_thread_local(), &id))
}

/// The Diff screen's file list and header counts.
///
/// This reads every blob the commit touched, because `+n −m` per file cannot
/// be known without diffing them. It is one call when the screen opens.
#[tauri::command]
pub fn commit_diff(state: State<'_, AppState>, id: String) -> Result<CommitDiff> {
    state.with_session(|session| diff::commit_diff(&session.repo.to_thread_local(), &id))
}

/// The hunks of one file, fetched as that file is selected.
#[tauri::command]
pub fn file_diff(state: State<'_, AppState>, id: String, path: String) -> Result<FileDiff> {
    state.with_session(|session| diff::file_diff(&session.repo.to_thread_local(), &id, &path))
}

#[tauri::command]
pub fn close_repo(state: State<'_, AppState>) {
    *state.session.lock().expect("session lock") = None;
}

#[tauri::command]
pub fn metrics() -> Metrics {
    Metrics { row_pitch: ROW_PITCH }
}

#[tauri::command]
pub fn about() -> About {
    About {
        version: env!("CARGO_PKG_VERSION"),
        commit: env!("GITLORD_COMMIT"),
        license: "GPL-3.0-or-later",
    }
}

/// The path the app was launched with, if any: `gitlord /path/to/repo`.
#[tauri::command]
pub fn launch_path(app: AppHandle) -> Option<PathBuf> {
    let _ = app.webview_windows();
    std::env::args().nth(1).map(PathBuf::from).filter(|p| p.exists())
}
