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
	CommitDiff,
	FileDiff,
	OpenResult,
	Snapshot
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
