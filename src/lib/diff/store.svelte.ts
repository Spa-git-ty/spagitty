// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * One commit's diff.
 *
 * Loaded in two steps, because they cost different amounts. The file list and
 * its `+n −m` come from a single `commit_diff` when the screen opens; the hunks
 * of a file are fetched as that file is selected, and kept, so walking back and
 * forth through a commit's files costs one fetch each rather than one per view.
 *
 * The cache is keyed by path and thrown away when the commit changes — it is a
 * within-commit convenience, not a history of everything ever opened.
 */

import * as api from '../api';
import type { CommitDiff, FileDiff } from '../types';

export type DiffView = 'unified' | 'split';

const VIEW_KEY = 'spagitty.diffView';

let commitId = $state<string | null>(null);
let commit = $state<CommitDiff | null>(null);
let error = $state<string | null>(null);
let loading = $state(false);

let path = $state<string | null>(null);
let file = $state<FileDiff | null>(null);
let fileError = $state<string | null>(null);
let fileLoading = $state(false);

let view = $state<DiffView>('unified');

/** Hunks already fetched for the open commit. */
let cache = new Map<string, FileDiff>();

/** Guard against a slow fetch landing after a newer one. */
let commitSeq = 0;
let fileSeq = 0;

function reset() {
	commit = null;
	error = null;
	path = null;
	file = null;
	fileError = null;
	fileLoading = false;
	cache = new Map();
}

export const diff = {
	/** The commit currently on screen, or null before the first load. */
	get commitId(): string | null {
		return commitId;
	},
	get commit(): CommitDiff | null {
		return commit;
	},
	get error(): string | null {
		return error;
	},
	get loading(): boolean {
		return loading;
	},
	get path(): string | null {
		return path;
	},
	get file(): FileDiff | null {
		return file;
	},
	get fileError(): string | null {
		return fileError;
	},
	get fileLoading(): boolean {
		return fileLoading;
	},
	get view(): DiffView {
		return view;
	},

	/** Position of the selected file, 0-based. -1 when nothing is selected. */
	get index(): number {
		if (commit === null || path === null) return -1;
		return commit.files.findIndex((f) => f.path === path);
	},

	get count(): number {
		return commit?.files.length ?? 0;
	},

	setView(next: DiffView) {
		view = next;
		try {
			localStorage.setItem(VIEW_KEY, next);
		} catch {
			// Storage unavailable; the choice just won't survive a restart.
		}
	},

	init() {
		try {
			const stored = localStorage.getItem(VIEW_KEY);
			if (stored === 'unified' || stored === 'split') view = stored;
		} catch {
			// Unreadable; unified is the default for a reason.
		}
	},

	/**
	 * Load a commit. Re-opening the same commit keeps what is already on screen,
	 * so navigating back to the Diff screen does not re-fetch it.
	 */
	async open(id: string): Promise<void> {
		if (id === commitId && commit !== null) return;

		commitId = id;
		reset();
		loading = true;

		const seq = ++commitSeq;
		try {
			const result = await api.commitDiff(id);
			if (seq !== commitSeq) return;
			commit = result;
			// A commit always opens on its first file: an empty pane beside a
			// list of files is a click the screen can make for you.
			if (result.files.length > 0) this.select(result.files[0].path);
		} catch (e) {
			if (seq === commitSeq) error = String(e);
		} finally {
			if (seq === commitSeq) loading = false;
		}
	},

	/** Select a file and fetch its hunks, or take them from the cache. */
	select(next: string): void {
		if (commitId === null) return;
		path = next;
		fileError = null;

		const cached = cache.get(next);
		if (cached) {
			file = cached;
			fileLoading = false;
			return;
		}

		file = null;
		fileLoading = true;

		const seq = ++fileSeq;
		const id = commitId;
		api
			.fileDiff(id, next)
			.then((result) => {
				cache.set(next, result);
				if (seq !== fileSeq) return;
				file = result;
				fileLoading = false;
			})
			.catch((e) => {
				if (seq !== fileSeq) return;
				fileError = String(e);
				fileLoading = false;
			});
	},

	/** Move `delta` files through the list. Stops at either end. */
	step(delta: number): void {
		if (commit === null || commit.files.length === 0) return;
		const next = Math.min(Math.max(this.index + delta, 0), commit.files.length - 1);
		if (next !== this.index) this.select(commit.files[next].path);
	},

	clear(): void {
		commitId = null;
		commitSeq += 1;
		fileSeq += 1;
		reset();
		loading = false;
	}
};
