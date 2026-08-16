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
	CommitDetail,
	BranchRow,
	CommitDiff,
	ConflictSides,
	ConflictState,
	DiffSide,
	FileDiff,
	OpenResult,
	RepoSummary,
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

/** What is in progress and what is conflicted. Reads only; nothing is written. */
export function conflicts(): Promise<ConflictState> {
	return invoke('conflicts');
}

/** The three index stages of one conflicted path, plus the file on disk. */
export function conflictSides(path: string): Promise<ConflictSides> {
	return invoke('conflict_sides', { path });
}

/** Every remembered repository, as a card. Reads each where it sits. */
export function recentRepos(): Promise<RepoSummary[]> {
	return invoke('recent_repos');
}

/** Remove a repository from GitLord's list. The directory is not touched. */
export function forgetRepo(path: string): Promise<void> {
	return invoke('forget_repo', { path });
}

export function about(): Promise<About> {
	return invoke('about');
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
