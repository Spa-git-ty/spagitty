// SPDX-License-Identifier: GPL-3.0-or-later

//! Tauri commands. This layer is deliberately thin: it holds the open session,
//! forwards to `gitlord-core`, and converts errors to strings for the webview.
//! No git logic lives here.

use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;

use gitlord_core::blame::{self, Blame};
use gitlord_core::branches::{self, BranchRow};
use gitlord_core::conflicts::{self, ConflictSides, ConflictState};
use gitlord_core::diff::{self, CommitDetail, CommitDiff, FileDiff, Side};
use gitlord_core::graph::ROW_PITCH;
use gitlord_core::identity::{self, Identity, Key, Scope};
use gitlord_core::rebase::{self, Edit, Preview, Todo};
use gitlord_core::refs::RefIndex;
use gitlord_core::repo::{self, RepoInfo, RepoSummary};
use gitlord_core::search::Query;
use gitlord_core::stash::{self, StashEntry};
use gitlord_core::status::{self, RepoCounts, WorkingCopy};
use gitlord_core::work;
use gitlord_core::{Error, Result};
use serde::Serialize;
use tauri::{AppHandle, Manager, State};

use crate::about::{About, Licenses};
use crate::graph_worker::{self, GraphWorker};
use crate::recents;
use crate::search_worker::{self, SearchWorker};
use crate::settings::Settings;
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
    /// The query running right now, if any. Replacing it cancels the one it
    /// replaces — a search is restartable, not resumable.
    search: Mutex<Option<SearchWorker>>,
    /// The todo list the Rebase screen is planning against.
    ///
    /// Kept here rather than round-tripped through the webview on every
    /// keystroke: the preview is recomputed on every edit, and sending the
    /// whole list back each time would be both wasteful and a way for the
    /// screen to plan against a list the repository never produced.
    rebase_todo: Mutex<Option<Todo>>,
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
    let watcher = watch::watch(app.clone(), &git_dir);

    // Opening is the only way a repository joins the list. GitLord never goes
    // looking for repositories on its own.
    recents::remember(&app, &info.path);

    // Replacing the session drops the previous worker and watcher, which joins
    // their threads before we return.
    *state.session.lock().expect("session lock") = Some(Session {
        path: info.path.clone(),
        repo: sync,
        graph,
        _watcher: watcher,
    });

    Ok(OpenResult {
        info,
        counts,
        token,
    })
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

/// The staged, unstaged and conflicted lists behind the Working copy screen.
///
/// This is the full status walk, so it is one call per refresh rather than one
/// per row.
#[tauri::command]
pub fn working_copy(state: State<'_, AppState>) -> Result<WorkingCopy> {
    state.with_session(|session| status::working_copy(&session.repo.to_thread_local()))
}

/// One working-copy file's hunks, on either side of the index.
#[tauri::command]
pub fn working_diff(state: State<'_, AppState>, path: String, side: Side) -> Result<FileDiff> {
    state.with_session(|session| {
        diff::working_file_diff(&session.repo.to_thread_local(), &path, side)
    })
}

#[tauri::command]
pub fn stage(state: State<'_, AppState>, paths: Vec<String>) -> Result<()> {
    state.with_session(|session| work::stage(&session.repo.to_thread_local(), &paths))
}

#[tauri::command]
pub fn unstage(state: State<'_, AppState>, paths: Vec<String>) -> Result<()> {
    state.with_session(|session| work::unstage(&session.repo.to_thread_local(), &paths))
}

/// Stage one hunk. `header` identifies it, so a stale view is refused rather
/// than half-applied.
#[tauri::command]
pub fn stage_hunk(
    state: State<'_, AppState>,
    path: String,
    index: usize,
    header: String,
) -> Result<()> {
    state.with_session(|session| {
        work::stage_hunk(&session.repo.to_thread_local(), &path, index, &header)
    })
}

#[tauri::command]
pub fn unstage_hunk(
    state: State<'_, AppState>,
    path: String,
    index: usize,
    header: String,
) -> Result<()> {
    state.with_session(|session| {
        work::unstage_hunk(&session.repo.to_thread_local(), &path, index, &header)
    })
}

/// Commit what is staged. Returns the new commit's id.
#[tauri::command]
pub fn commit(
    state: State<'_, AppState>,
    subject: String,
    body: String,
    amend: bool,
) -> Result<String> {
    state.with_session(|session| {
        work::commit(&session.repo.to_thread_local(), &subject, &body, amend)
    })
}

/// The message of the commit HEAD points at, for pre-filling an amend.
#[tauri::command]
pub fn head_message(state: State<'_, AppState>) -> Result<String> {
    state.with_session(|session| work::head_message(&session.repo.to_thread_local()))
}

/// Every branch, with how far it has drifted. One call per refresh.
///
/// Opens the repository again rather than reusing the session handle. A branch
/// upstream lives in `.git/config`, and `gix` reads config once when a
/// repository is opened — so a `git branch --set-upstream-to` run while GitLord
/// is open would be invisible until it was restarted, and the screen would
/// report "no upstream" for a branch that has one. Re-discovery costs one
/// directory walk; being quietly wrong about drift costs more.
#[tauri::command]
pub fn branches(state: State<'_, AppState>) -> Result<Vec<BranchRow>> {
    state.with_session(|session| branches::list(&repo::open(&session.path)?))
}

#[tauri::command]
pub fn checkout(state: State<'_, AppState>, name: String) -> Result<()> {
    state.with_session(|session| branches::checkout(&session.repo.to_thread_local(), &name))
}

/// Create a branch. `start` empty means `HEAD`.
#[tauri::command]
pub fn create_branch(
    state: State<'_, AppState>,
    name: String,
    start: String,
    checkout: bool,
) -> Result<()> {
    state.with_session(|session| {
        branches::create(&session.repo.to_thread_local(), &name, &start, checkout)
    })
}

/// Every stash entry, newest first. Ask `commit_diff` about an entry's `id` to
/// see what is in it — a stash is a commit.
#[tauri::command]
pub fn stashes(state: State<'_, AppState>) -> Result<Vec<StashEntry>> {
    state.with_session(|session| stash::list(&session.repo.to_thread_local()))
}

#[tauri::command]
pub fn stash_push(
    state: State<'_, AppState>,
    message: String,
    include_untracked: bool,
) -> Result<()> {
    state.with_session(|session| {
        stash::push(&session.repo.to_thread_local(), &message, include_untracked)
    })
}

/// The todo list `git rebase -i <upstream>` would open, before any edit.
///
/// Generated rather than read: running `git rebase -i` to see the file it opens
/// would start a rebase, which is the thing the Rebase screen exists to avoid.
#[tauri::command]
pub fn rebase_todo(state: State<'_, AppState>, upstream: String) -> Result<Todo> {
    let todo =
        state.with_session(|session| rebase::todo(&session.repo.to_thread_local(), &upstream))?;

    *state.rebase_todo.lock().expect("rebase lock") = Some(todo.clone());
    Ok(todo)
}

/// What a plan would produce.
///
/// Pure: a fold over the edits against the todo already read. No repository is
/// touched, and there is no path from here to `shell::rebase_interactive` —
/// executing a plan is FEAT-015.
#[tauri::command]
pub fn rebase_preview(state: State<'_, AppState>, edits: Vec<Edit>) -> Result<Preview> {
    let guard = state.rebase_todo.lock().expect("rebase lock");
    let todo = guard
        .as_ref()
        .ok_or_else(|| Error::NotStageable("no rebase is being planned".into()))?;

    Ok(rebase::plan(todo, &edits))
}

/// Start a query. Returns the token its rows will carry.
///
/// Rows arrive as `search-rows` events and the walk ends with `search-done`.
/// Starting a query cancels whichever one was running, so a store that sees
/// rows from an older token can drop them without asking.
#[tauri::command]
pub fn search_start(app: AppHandle, state: State<'_, AppState>, query: Query) -> Result<u64> {
    let path = state.with_session(|session| Ok(session.path.clone()))?;
    let token = state.next_token.fetch_add(1, Ordering::Relaxed);

    let worker = search_worker::spawn(app, path, query, token);
    // Assigning drops the previous worker, which cancels it and joins its
    // thread before this call returns.
    *state.search.lock().expect("search lock") = Some(worker);

    Ok(token)
}

/// Stop the running query. Leaving the screen is the ordinary caller.
#[tauri::command]
pub fn search_stop(state: State<'_, AppState>) {
    *state.search.lock().expect("search lock") = None;
}

/// Who last touched each line of `path` at `revision`. An empty revision is
/// `HEAD`.
#[tauri::command]
pub fn blame(state: State<'_, AppState>, path: String, revision: String) -> Result<Blame> {
    state.with_session(|session| blame::file(&session.repo.to_thread_local(), &path, &revision))
}

/// What operation is in progress, and every conflicted path.
///
/// Reads only. Taking a side, editing the merged result and marking a file
/// resolved are FEAT-016 and have no command here at all — a disabled button
/// backed by nothing is easier to explain than one backed by a half-written
/// write path.
#[tauri::command]
pub fn conflicts(state: State<'_, AppState>) -> Result<ConflictState> {
    state.with_session(|session| conflicts::state(&session.repo.to_thread_local()))
}

/// The three index stages of one conflicted path, plus the file on disk.
#[tauri::command]
pub fn conflict_sides(state: State<'_, AppState>, path: String) -> Result<ConflictSides> {
    state.with_session(|session| conflicts::sides(&session.repo.to_thread_local(), &path))
}

/// Every remembered repository, as a card.
///
/// Each is read where it sits, without becoming the open one: no walk, no
/// worker, no watcher, and nothing written to it. A path that has gone comes
/// back as a card that says so rather than being dropped — a repository that
/// moved is something to see, not something to forget quietly.
#[tauri::command]
pub fn recent_repos(app: AppHandle) -> Vec<RepoSummary> {
    recents::load(&app)
        .iter()
        .map(|path| repo::summary(path))
        .collect()
}

/// Remove a repository from GitLord's list. The directory is not touched.
#[tauri::command]
pub fn forget_repo(app: AppHandle, path: PathBuf) {
    recents::forget(&app, &path);
}

#[tauri::command]
pub fn close_repo(state: State<'_, AppState>) {
    *state.session.lock().expect("session lock") = None;
}

#[tauri::command]
pub fn metrics() -> Metrics {
    Metrics {
        row_pitch: ROW_PITCH,
    }
}

#[tauri::command]
pub fn about() -> About {
    crate::about::about()
}

/// Every dependency this binary is made of, with its license.
///
/// Generated from the lockfiles at build time rather than typed, so it cannot
/// quietly fall behind a `cargo update`. A build that could not generate it
/// returns the reason instead of an empty list.
#[tauri::command]
pub fn licenses() -> Licenses {
    crate::about::licenses()
}

/// `user.name` and `user.email`, per scope, and which one is in effect.
///
/// Settings does not need an open repository: with none, the global and system
/// configuration is read on its own and the local scope is reported as absent.
#[tauri::command]
pub fn identity(state: State<'_, AppState>) -> Result<Identity> {
    let guard = state.session.lock().expect("session lock");
    match guard.as_ref() {
        Some(session) => Ok(identity::read(&session.repo.to_thread_local())),
        None => identity::read_global(),
    }
}

/// Write one identity key in one scope. A blank value unsets the key.
///
/// The scope is what the user chose on the screen and is never inferred here.
/// Writing to the local scope needs a repository to write into; writing to the
/// global one does not, and runs wherever GitLord was started.
#[tauri::command]
pub fn set_identity(
    state: State<'_, AppState>,
    scope: Scope,
    key: Key,
    value: String,
) -> Result<Identity> {
    let open = state
        .session
        .lock()
        .expect("session lock")
        .as_ref()
        .map(|session| session.path.clone());

    let directory = match (scope, open) {
        (_, Some(path)) => path,
        (Scope::Local, None) => return Err(Error::NoRepository),
        (Scope::Global, None) => std::env::current_dir()?,
    };

    identity::write(&directory, scope, key, &value)?;
    identity(state)
}

/// GitLord's own behaviour toggles.
#[tauri::command]
pub fn settings(app: AppHandle) -> Settings {
    crate::settings::load(&app)
}

/// Store the behaviour toggles.
///
/// A failed write is reported rather than swallowed: a toggle that did not
/// persist looks exactly like one that did, until the next restart.
#[tauri::command]
pub fn set_settings(app: AppHandle, settings: Settings) -> std::result::Result<(), String> {
    crate::settings::save(&app, settings)
}

/// The path the app was launched with, if any: `gitlord /path/to/repo`.
#[tauri::command]
pub fn launch_path(app: AppHandle) -> Option<PathBuf> {
    let _ = app.webview_windows();
    std::env::args()
        .nth(1)
        .map(PathBuf::from)
        .filter(|p| p.exists())
}
