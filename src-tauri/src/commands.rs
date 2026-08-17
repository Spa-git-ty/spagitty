// SPDX-License-Identifier: GPL-3.0-or-later

//! Tauri commands. This layer is deliberately thin: it holds the open session,
//! forwards to `gitlord-core`, and converts errors to strings for the webview.
//! No git logic lives here.

use std::path::PathBuf;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;

use gitlord_core::blame::{self, Blame};
use gitlord_core::branches::{self, BranchRow};
use gitlord_core::clone::{self, Plan};
use gitlord_core::conflicts::{self, ConflictSides, ConflictState};
use gitlord_core::diff::{self, CommitDetail, CommitDiff, FileDiff, Side};
use gitlord_core::graph::ROW_PITCH;
use gitlord_core::identity::{self, Identity, Key, Scope};
use gitlord_core::ops::{self, Integration, ResetMode, StashAction};
use gitlord_core::rebase::{self, Edit, Preview, Todo};
use gitlord_core::record::{self, Executed};
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
use crate::clone_worker::{self, CloneWorker};
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
    /// The refs the graph is rooted at, empty for every branch.
    ///
    /// Held here rather than in the webview because a walk is restarted by the
    /// filesystem watcher as well as by the user: a ref moving must not quietly
    /// reset Solo or Smart Branch Visibility back to showing everything.
    visible: Vec<String>,
    /// The refs whose lanes are held open on the left — "pin to left".
    pinned: Vec<String>,
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
    /// The clone running right now, if any.
    ///
    /// One at a time: a second clone is refused rather than queued. Two is not
    /// a workflow anyone asked for, and the state it needs — a list of running
    /// clones, each with its own progress — is more machinery than the problem
    /// has.
    clone: Mutex<Option<CloneWorker>>,
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
    let graph = graph_worker::spawn(
        app.clone(),
        info.path.clone(),
        token,
        Vec::new(),
        Vec::new(),
    );
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
        visible: Vec::new(),
        pinned: Vec::new(),
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
    let (visible, pinned) = (session.visible.clone(), session.pinned.clone());
    session.graph = graph_worker::spawn(app, session.path.clone(), token, visible, pinned);
    Ok(token)
}

/// Choose which refs the graph is rooted at, and restart the walk.
///
/// An empty list is every branch. Hide, Solo and Smart Branch Visibility are
/// all the same command with a different list, computed on screen from the
/// branches it is already showing — the backend does not need to know which of
/// the three the user pressed, only what they want to see.
#[tauri::command]
pub fn graph_visibility(
    app: AppHandle,
    state: State<'_, AppState>,
    refs: Vec<String>,
    pinned: Vec<String>,
) -> Result<u64> {
    let mut guard = state.session.lock().expect("session lock");
    let session = guard.as_mut().ok_or(Error::NoRepository)?;

    session.visible = refs;
    session.pinned = pinned;
    let token = state.next_token.fetch_add(1, Ordering::Relaxed);
    let (visible, pinned) = (session.visible.clone(), session.pinned.clone());
    session.graph = graph_worker::spawn(app, session.path.clone(), token, visible, pinned);
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

// --- History operations -----------------------------------------------------
//
// Every command below writes. They share one shape on purpose: forward to
// `gitlord_core::ops`, and let the error come back as git's own sentence. No
// confirmation happens here — the screen asks, because a backend that prompted
// could not be scripted or tested — and no operation is inferred from another.
// "Reset" is three commands in the menu because it is three different things.

/// Execute the plan the Rebase screen built.
///
/// The todo is generated from the same order the preview was generated from, so
/// what was on screen is what git runs. It is generated here rather than sent
/// from the webview for the same reason the preview is: a plan the repository
/// never produced must not be executable by asking nicely.
#[tauri::command]
pub fn rebase_run(state: State<'_, AppState>, edits: Vec<Edit>) -> Result<()> {
    let (upstream, todo) = {
        let guard = state.rebase_todo.lock().expect("rebase lock");
        let todo = guard
            .as_ref()
            .ok_or_else(|| Error::NotStageable("no rebase is being planned".into()))?;
        (todo.upstream.clone(), rebase::todo_text(todo, &edits)?)
    };

    state.with_session(|session| {
        ops::rebase_interactive(&session.repo.to_thread_local(), &upstream, &todo)
    })
}

/// Move the current branch to `commit`.
///
/// `Hard` discards uncommitted work. The mode arrives as an enum rather than a
/// string so that the webview cannot send a harder reset than the one whose
/// consequences the user read in the menu.
#[tauri::command]
pub fn reset(state: State<'_, AppState>, commit: String, mode: ResetMode) -> Result<()> {
    state.with_session(|session| ops::reset(&session.repo.to_thread_local(), &commit, mode))
}

/// Commit the inverse of `commit`. Reverting a merge takes the first parent as
/// the mainline, which is the parent the graph draws as the trunk.
#[tauri::command]
pub fn revert(state: State<'_, AppState>, commit: String) -> Result<()> {
    state.with_session(|session| ops::revert(&session.repo.to_thread_local(), &commit))
}

/// Replay `commits` onto the current branch, in the order given.
#[tauri::command]
pub fn cherry_pick(state: State<'_, AppState>, commits: Vec<String>) -> Result<()> {
    state.with_session(|session| ops::cherry_pick(&session.repo.to_thread_local(), &commits))
}

/// Merge, fast-forward or rebase `source` into the branch that is checked out.
///
/// This is what dropping one branch label onto another resolves to, once the
/// user has picked from the menu that appears.
#[tauri::command]
pub fn integrate(state: State<'_, AppState>, source: String, how: Integration) -> Result<()> {
    state.with_session(|session| ops::integrate(&session.repo.to_thread_local(), &source, how))
}

/// Replay commits onto `onto`.
///
/// `upstream` empty moves the whole branch — "rebase this onto that". A commit
/// in `upstream` moves only what comes after it, which is the graph's "rebase
/// these N commits onto". `branch` empty means HEAD.
#[tauri::command]
pub fn rebase_onto(
    state: State<'_, AppState>,
    onto: String,
    upstream: String,
    branch: String,
) -> Result<()> {
    state.with_session(|session| {
        ops::rebase_onto(&session.repo.to_thread_local(), &onto, &upstream, &branch)
    })
}

/// Check out a commit with no branch attached.
#[tauri::command]
pub fn checkout_detached(state: State<'_, AppState>, revision: String) -> Result<()> {
    state.with_session(|session| ops::checkout_detached(&session.repo.to_thread_local(), &revision))
}

/// Rename a local branch.
#[tauri::command]
pub fn rename_branch(state: State<'_, AppState>, from: String, to: String) -> Result<()> {
    state.with_session(|session| ops::rename_branch(&session.repo.to_thread_local(), &from, &to))
}

/// Delete a local branch. `force` is `-D`, and loses unmerged commits.
#[tauri::command]
pub fn delete_branch(state: State<'_, AppState>, name: String, force: bool) -> Result<()> {
    state.with_session(|session| ops::delete_branch(&session.repo.to_thread_local(), &name, force))
}

/// Create a tag at `target`. A message makes it annotated.
#[tauri::command]
pub fn create_tag(
    state: State<'_, AppState>,
    name: String,
    target: String,
    message: String,
) -> Result<()> {
    state.with_session(|session| {
        ops::create_tag(&session.repo.to_thread_local(), &name, &target, &message)
    })
}

/// Delete a local tag.
#[tauri::command]
pub fn delete_tag(state: State<'_, AppState>, name: String) -> Result<()> {
    state.with_session(|session| ops::delete_tag(&session.repo.to_thread_local(), &name))
}

/// Apply, pop or drop a stash entry.
#[tauri::command]
pub fn stash_action(state: State<'_, AppState>, index: usize, action: StashAction) -> Result<()> {
    state.with_session(|session| ops::stash(&session.repo.to_thread_local(), index, action))
}

/// Fetch, pruning refs the remote no longer has. An empty remote fetches all.
#[tauri::command]
pub fn fetch(state: State<'_, AppState>, remote: String) -> Result<String> {
    state.with_session(|session| ops::fetch(&session.repo.to_thread_local(), &remote))
}

/// Push. `force` is `--force-with-lease`, never a plain force.
#[tauri::command]
pub fn push(
    state: State<'_, AppState>,
    remote: String,
    refspec: String,
    force: bool,
) -> Result<String> {
    state.with_session(|session| {
        ops::push(&session.repo.to_thread_local(), &remote, &refspec, force)
    })
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

/// Where a clone would land, and what is wrong with that.
///
/// Recomputed as the user types, because every refusal here is knowable without
/// the network: telling somebody after a round trip what they could have been
/// told while typing is the failure this exists to avoid.
#[tauri::command]
pub fn clone_plan(url: String, parent: PathBuf) -> Plan {
    clone::plan(&url, &parent)
}

/// Start a clone. Returns the token its progress will carry.
///
/// Progress arrives as `clone-progress` events and the clone ends with
/// `clone-done`. The plan is recomputed here rather than taken from the caller:
/// a destination that filled up between the last keystroke and the button is
/// still a destination this must refuse.
#[tauri::command]
pub fn clone_start(
    app: AppHandle,
    state: State<'_, AppState>,
    url: String,
    parent: PathBuf,
) -> Result<u64> {
    if state.clone.lock().expect("clone lock").is_some() {
        return Err(Error::NotStageable(
            "a clone is already running; wait for it or stop it first".into(),
        ));
    }

    let plan = clone::plan(&url, &parent);
    let destination = match (&plan.problem, plan.destination) {
        (Some(problem), _) => return Err(Error::NotStageable(problem.message())),
        (None, Some(destination)) => destination,
        (None, None) => return Err(Error::NotStageable("there is nowhere to clone to".into())),
    };

    let token = state.next_token.fetch_add(1, Ordering::Relaxed);
    let worker = clone_worker::spawn(app, url, destination, plan.creates_destination, token)?;

    *state.clone.lock().expect("clone lock") = Some(worker);
    Ok(token)
}

/// Stop the running clone, and forget it either way.
///
/// One command for both "the user pressed Stop" and "it finished, let go of
/// it", because they are the same operation: dropping the worker kills a
/// process that is still running and joins a thread that is not. Cancelling
/// removes the destination only if the clone created it — a directory that was
/// already there is left exactly as it was found.
#[tauri::command]
pub fn clone_release(state: State<'_, AppState>) {
    *state.clone.lock().expect("clone lock") = None;
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

/// Every `git` command GitLord has executed since `since`, oldest first.
///
/// The panel subscribes to [`crate::command_log::EXECUTED_EVENT`] for new
/// entries, so this is the catch-up call: what ran before the panel was opened,
/// or while the webview was reloading. `since` of 0 is everything still held.
#[tauri::command]
pub fn git_commands(since: u64) -> Vec<Executed> {
    record::recent(since)
}

/// Forget the recorded commands. The user's action, from the panel.
#[tauri::command]
pub fn clear_git_commands() {
    record::clear();
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
