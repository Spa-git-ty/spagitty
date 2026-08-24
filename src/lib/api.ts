// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Typed wrappers around the Tauri commands.
 *
 * This is the only module that calls `invoke`. Everything else talks in the
 * types from `./types`, so a command rename is a one-file change.
 */

import { invoke } from '@tauri-apps/api/core';
import type {
	About,
	Blame,
	CommitDetail,
	BranchRow,
	ClonePlan,
	CommitDiff,
	ConflictRegion,
	ConflictSideName,
	ConflictSides,
	ConflictState,
	DiffSide,
	ExecutedCommand,
	FileDiff,
	Identity,
	IdentityKey,
	IdentityScope,
	Licenses,
	OpenResult,
	Integration,
	PullMode,
	RebaseEdit,
	RebasePreview,
	RebaseProgress,
	RebaseTodo,
	ResetMode,
	StashAction,
	RepoSummary,
	SearchQuery,
	Settings,
	Snapshot,
	StashEntry,
	WorkingCopy
} from './types';

export function openRepo(path: string): Promise<OpenResult> {
	return invoke('open_repo', { path });
}

export function closeRepo(): Promise<void> {
	return invoke('close_repo');
}

/** Ask the walker for more rows. Resolves immediately; rows arrive as events. */
export function graphRequest(token: number, count: number): Promise<void> {
	return invoke('graph_request', { token, count });
}

/** Restart the walk after refs moved. Resolves to the new token. */
export function graphRestart(): Promise<number> {
	return invoke('graph_restart');
}

/**
 * Choose which refs the graph is rooted at, and restart the walk.
 *
 * An empty list is every branch. Hide, Solo and Smart Branch Visibility are the
 * same call with different lists — the backend is told what to show, not which
 * control was pressed. Resolves to the new token.
 */
export function graphVisibility(refs: string[], pinned: string[] = []): Promise<number> {
	return invoke('graph_visibility', { refs, pinned });
}

export function snapshot(): Promise<Snapshot> {
	return invoke('snapshot');
}

export function commitDetail(id: string): Promise<CommitDetail> {
	return invoke('commit_detail', { id });
}

/** The Diff screen's file list and header counts. One call per commit. */
export function commitDiff(id: string): Promise<CommitDiff> {
	return invoke('commit_diff', { id });
}

/** One file's hunks, fetched as that file is opened. */
export function fileDiff(id: string, path: string): Promise<FileDiff> {
	return invoke('file_diff', { id, path });
}

/** The staged, unstaged and conflicted lists. One call per refresh. */
export function workingCopy(): Promise<WorkingCopy> {
	return invoke('working_copy');
}

/** One working-copy file's hunks, on either side of the index. */
export function workingDiff(path: string, side: DiffSide): Promise<FileDiff> {
	return invoke('working_diff', { path, side });
}

export function stage(paths: string[]): Promise<void> {
	return invoke('stage', { paths });
}

export function unstage(paths: string[]): Promise<void> {
	return invoke('unstage', { paths });
}

/**
 * Stage one hunk. `header` identifies which one, so a view that has gone stale
 * is refused rather than half-applied.
 */
export function stageHunk(path: string, index: number, header: string): Promise<void> {
	return invoke('stage_hunk', { path, index, header });
}

export function unstageHunk(path: string, index: number, header: string): Promise<void> {
	return invoke('unstage_hunk', { path, index, header });
}

/**
 * Throw away unstaged changes to whole paths.
 *
 * The only call in this file that destroys work git cannot get back. The
 * confirmation is the caller's job, and every caller has one.
 */
export function discard(paths: string[]): Promise<void> {
	return invoke('discard', { paths });
}

/** Throw away one unstaged hunk. Refused if the view it came from is stale. */
export function discardHunk(path: string, index: number, header: string): Promise<void> {
	return invoke('discard_hunk', { path, index, header });
}

/** Commit what is staged. Resolves to the new commit's id. */
export function commit(subject: string, body: string, amend: boolean): Promise<string> {
	return invoke('commit', { subject, body, amend });
}

/** The message of the commit HEAD points at, for pre-filling an amend. */
export function headMessage(): Promise<string> {
	return invoke('head_message');
}

/** Every branch, with how far it has drifted. One call per refresh. */
export function branches(): Promise<BranchRow[]> {
	return invoke('branches');
}

export function checkout(name: string): Promise<void> {
	return invoke('checkout', { name });
}

/** Create a branch. An empty `start` means HEAD. */
export function createBranch(name: string, start: string, checkout: boolean): Promise<void> {
	return invoke('create_branch', { name, start, checkout });
}

/** Every stash entry, newest first. */
export function stashes(): Promise<StashEntry[]> {
	return invoke('stashes');
}

/** Stash the working copy. Refused when there is nothing to stash. */
export function stashPush(message: string, includeUntracked: boolean): Promise<void> {
	return invoke('stash_push', { message, includeUntracked });
}

/**
 * The todo list `git rebase -i <upstream>` would open, before any edit.
 *
 * Generated rather than read: opening the real one would start a rebase.
 */
export function rebaseTodo(upstream: string): Promise<RebaseTodo> {
	return invoke('rebase_todo', { upstream });
}

/**
 * What a plan would produce.
 *
 * The todo itself stays in Rust — only the edits cross, since the preview is
 * recomputed on every change.
 */
export function rebasePreview(edits: RebaseEdit[]): Promise<RebasePreview> {
	return invoke('rebase_preview', { edits });
}

/**
 * Start a query. Resolves to the token its rows will carry.
 *
 * Rows arrive as `search-rows` events; the walk ends with `search-done`.
 * Starting a query cancels whichever one was running.
 */
export function searchStart(query: SearchQuery): Promise<number> {
	return invoke('search_start', { query });
}

/** Stop the running query. */
export function searchStop(): Promise<void> {
	return invoke('search_stop');
}

/** Who last touched each line. An empty revision means HEAD. */
export function blame(path: string, revision: string): Promise<Blame> {
	return invoke('blame', { path, revision });
}

/** What is in progress and what is conflicted. Reads only; nothing is written. */
export function conflicts(): Promise<ConflictState> {
	return invoke('conflicts');
}

/** The three index stages of one conflicted path, plus the file on disk. */
export function conflictSides(path: string): Promise<ConflictSides> {
	return invoke('conflict_sides', { path });
}

/** Every conflict region in a file's merged text. */
export function conflictRegions(text: string): Promise<ConflictRegion[]> {
	return invoke('conflict_regions', { text });
}

/**
 * Take one whole side of a conflicted file into the working tree.
 *
 * The file stays conflicted afterwards: marking it resolved is a separate call,
 * because looking at the result is the point of the screen.
 */
export function conflictTake(path: string, side: ConflictSideName): Promise<void> {
	return invoke('conflict_take', { path, side });
}

/**
 * Resolve one marker region, or every region when `index` is null.
 *
 * The file is re-read on the other side rather than sent from here, so a stale
 * screen cannot resolve a region that has moved.
 */
export function conflictResolveRegion(
	path: string,
	index: number | null,
	side: ConflictSideName
): Promise<void> {
	return invoke('conflict_resolve_region', { path, index, side });
}

/** Write the merged pane's text to the file, exactly as given. */
export function conflictWrite(path: string, text: string): Promise<void> {
	return invoke('conflict_write', { path, text });
}

/** Mark paths resolved: `git add`. */
export function conflictResolve(paths: string[]): Promise<void> {
	return invoke('conflict_resolve', { paths });
}

/** Carry on with whatever the repository is in the middle of. */
export function conflictContinue(): Promise<void> {
	return invoke('conflict_continue');
}

/** Abandon it and put the repository back. */
export function conflictAbort(): Promise<void> {
	return invoke('conflict_abort');
}

/** Every remembered repository, as a card. Reads each where it sits. */
export function recentRepos(): Promise<RepoSummary[]> {
	return invoke('recent_repos');
}

/**
 * Where a clone would land, and what is wrong with that.
 *
 * Recomputed as the user types: every refusal is knowable without the network.
 */
export function clonePlan(url: string, parent: string): Promise<ClonePlan> {
	return invoke('clone_plan', { url, parent });
}

/**
 * Start a clone. Resolves to the token its progress will carry.
 *
 * Progress arrives as `clone-progress` events; the clone ends with
 * `clone-done`. Rejects when a clone is already running, or when the plan is
 * refused — the plan is recomputed in Rust, so a destination that filled up
 * since the last keystroke is still refused.
 */
export function cloneStart(url: string, parent: string): Promise<number> {
	return invoke('clone_start', { url, parent });
}

/**
 * Stop the running clone and let go of it — the same call for "the user pressed
 * Stop" and "it finished". Cancelling removes the destination only if the clone
 * created it.
 */
export function cloneRelease(): Promise<void> {
	return invoke('clone_release');
}

/** Remove a repository from Spagitty's list. The directory is not touched. */
export function forgetRepo(path: string): Promise<void> {
	return invoke('forget_repo', { path });
}

export function about(): Promise<About> {
	return invoke('about');
}

/** Every dependency this build is made of. Generated from the lockfiles. */
export function licenses(): Promise<Licenses> {
	return invoke('licenses');
}

/** `user.name` and `user.email`, per scope, and which one is in effect. */
export function identity(): Promise<Identity> {
	return invoke('identity');
}

/**
 * Write one identity key in one scope, resolving to the identity as it now
 * stands. A blank value unsets the key rather than storing an empty string.
 */
export function setIdentity(
	scope: IdentityScope,
	key: IdentityKey,
	value: string
): Promise<Identity> {
	return invoke('set_identity', { scope, key, value });
}

/** Spagitty's own behaviour toggles. */
export function settings(): Promise<Settings> {
	return invoke('settings');
}

/** Store the behaviour toggles. Rejects when the write did not reach the disk. */
export function setSettings(settings: Settings): Promise<void> {
	return invoke('set_settings', { settings });
}

export function launchPath(): Promise<string | null> {
	return invoke('launch_path');
}

/** Rust's view of the shared structural constants. */
export function metrics(): Promise<{ rowPitch: number }> {
	return invoke('metrics');
}

/** True when running inside the Tauri webview rather than a plain browser. */
export function inTauri(): boolean {
	return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

// --- History operations -----------------------------------------------------
//
// Every call below writes to the repository. None of them asks first: the
// confirmation belongs to the screen, next to the sentence describing what is
// about to happen, and a wrapper that prompted would put that sentence in the
// wrong file.

/**
 * Move the current branch to `commit`.
 *
 * `'hard'` discards uncommitted work. The mode is a union rather than a string
 * so a typo cannot become a harder reset than the one that was offered.
 */
export function reset(commit: string, mode: ResetMode): Promise<void> {
	return invoke('reset', { commit, mode });
}

/** Commit the inverse of `commit`. A merge is reverted against its first parent. */
export function revert(commit: string): Promise<void> {
	return invoke('revert', { commit });
}

/** Replay `commits` onto the current branch, in the order given (oldest first). */
export function cherryPick(commits: string[]): Promise<void> {
	return invoke('cherry_pick', { commits });
}

/** Merge, fast-forward or rebase `source` into the branch that is checked out. */
export function integrate(source: string, how: Integration): Promise<void> {
	return invoke('integrate', { source, how });
}

/**
 * Replay commits onto `onto`.
 *
 * `upstream` empty moves the whole branch. A commit in `upstream` moves only
 * what comes after it — the graph's "rebase these N commits onto". `branch`
 * empty means HEAD.
 */
export function rebaseOnto(onto: string, upstream = '', branch = ''): Promise<void> {
	return invoke('rebase_onto', { onto, upstream, branch });
}

/** Run the plan the Rebase screen built against the todo it is holding. */
/**
 * Execute the plan. Resolves to the token its events carry, not to the outcome.
 *
 * The rebase runs on a worker: progress arrives as `rebase-progress` and it
 * ends with `rebase-done`, which says whether git finished or stopped part-way
 * waiting for a conflict to be resolved.
 */
export function rebaseRun(edits: RebaseEdit[]): Promise<number> {
	return invoke('rebase_run', { edits });
}

/** How far a rebase that is running has got, or null when none is. */
export function rebaseProgress(): Promise<RebaseProgress | null> {
	return invoke('rebase_progress');
}

/** Carry on with a rebase that stopped, once its conflicts are resolved. */
export function rebaseContinue(): Promise<void> {
	return invoke('rebase_continue');
}

/** Drop the commit a rebase stopped on and carry on with the rest. */
export function rebaseSkip(): Promise<void> {
	return invoke('rebase_skip');
}

/** Unwind a rebase and put the branch back where it started. */
export function rebaseAbort(): Promise<void> {
	return invoke('rebase_abort');
}

/** Check out a commit with no branch attached — a detached HEAD. */
export function checkoutDetached(revision: string): Promise<void> {
	return invoke('checkout_detached', { revision });
}

export function renameBranch(from: string, to: string): Promise<void> {
	return invoke('rename_branch', { from, to });
}

/** Delete a local branch. `force` loses commits that are not merged anywhere. */
export function deleteBranch(name: string, force = false): Promise<void> {
	return invoke('delete_branch', { name, force });
}

/** Create a tag at `target`. A non-empty message makes it annotated. */
export function createTag(name: string, target: string, message = ''): Promise<void> {
	return invoke('create_tag', { name, target, message });
}

export function deleteTag(name: string): Promise<void> {
	return invoke('delete_tag', { name });
}

/** Apply, pop or drop `stash@{index}`. */
export function stashAction(index: number, action: StashAction): Promise<void> {
	return invoke('stash_action', { index, action });
}

/** Fetch, pruning refs the remote no longer has. An empty remote fetches all. */
export function fetch(remote = ''): Promise<string> {
	return invoke('fetch', { remote });
}

/**
 * Pull: fetch and integrate, in one `git pull`.
 *
 * One call rather than fetch-then-merge, because git resolves which upstream the
 * current branch tracks — from `branch.<name>.remote` and `branch.<name>.merge`,
 * either of which may be configured per branch — and that resolution is exactly
 * the part not worth reimplementing.
 */
export function pull(mode: PullMode, remote = ''): Promise<string> {
	return invoke('pull', { remote, mode });
}

/** Push. `force` is `--force-with-lease`, never a plain force. */
export function push(remote = '', refspec = '', force = false): Promise<string> {
	return invoke('push', { remote, refspec, force });
}

/**
 * Every `git` command Spagitty has run since `since`, oldest first.
 *
 * New ones also arrive as `git-command` events; this is the catch-up read for
 * what ran before the panel was opened.
 */
export function gitCommands(since = 0): Promise<ExecutedCommand[]> {
	return invoke('git_commands', { since });
}

/** Forget the recorded commands. */
export function clearGitCommands(): Promise<void> {
	return invoke('clear_git_commands');
}
