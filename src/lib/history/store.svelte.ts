// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * File history and blame store (FEAT-063).
 *
 * Manages reactive state for inspecting a file's commit evolution and
 * interactive line-by-line blame attribution.
 */

import * as api from '../api';
import type { Blame, FileHistoryEntry } from '../types';

let currentPath = $state<string | null>(null);
let currentRevision = $state<string>('HEAD');
let entries = $state<FileHistoryEntry[]>([]);
let blameData = $state<Blame | null>(null);
let loading = $state<boolean>(false);
let error = $state<string | null>(null);
let highlightedCommit = $state<string | null>(null);

let seq = 0;

export const fileHistory = {
	get path(): string | null {
		return currentPath;
	},
	get revision(): string {
		return currentRevision;
	},
	get entries(): FileHistoryEntry[] {
		return entries;
	},
	get blame(): Blame | null {
		return blameData;
	},
	get loading(): boolean {
		return loading;
	},
	get error(): string | null {
		return error;
	},
	get highlightedCommit(): string | null {
		return highlightedCommit;
	},

	setHighlight(commitSha: string | null): void {
		highlightedCommit = commitSha;
	},

	async inspect(path: string, revision = 'HEAD'): Promise<void> {
		const thisSeq = ++seq;
		currentPath = path;
		currentRevision = revision;
		loading = true;
		error = null;
		highlightedCommit = null;

		try {
			const [historyRes, blameRes] = await Promise.all([
				api.fileHistory(path, 100),
				api.blame(path, revision)
			]);

			if (thisSeq === seq) {
				entries = historyRes;
				blameData = blameRes;
				loading = false;
			}
		} catch (err) {
			if (thisSeq === seq) {
				error = err instanceof Error ? err.message : String(err);
				loading = false;
			}
		}
	},

	reset(): void {
		currentPath = null;
		currentRevision = 'HEAD';
		entries = [];
		blameData = null;
		loading = false;
		error = null;
		highlightedCommit = null;
		seq = 0;
	}
};
