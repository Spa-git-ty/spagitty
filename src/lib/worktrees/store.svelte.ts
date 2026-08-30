// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Worktrees store (FEAT-062).
 *
 * Manages reactive state for git worktrees attached to the open repository,
 * supporting listing, adding, removing, locking, unlocking, and pruning.
 */

import * as api from '../api';
import type { Worktree } from '../types';

let list = $state<Worktree[]>([]);
let loaded = $state(false);
let loading = $state(false);
let error = $state<string | null>(null);
let busy = $state(false);
let actionError = $state<string | null>(null);

let seq = 0;

export const worktrees = {
	get list(): Worktree[] {
		return list;
	},
	get loaded(): boolean {
		return loaded;
	},
	get loading(): boolean {
		return loading;
	},
	get error(): string | null {
		return error;
	},
	get busy(): boolean {
		return busy;
	},
	get actionError(): string | null {
		return actionError;
	},

	/** The main / root repository worktree. */
	get main(): Worktree | undefined {
		return list.find((w) => w.isMain);
	},

	/** Linked worktrees (excluding the root). */
	get linked(): Worktree[] {
		return list.filter((w) => !w.isMain);
	},

	/** Count of total worktrees. */
	get count(): number {
		return list.length;
	},

	async fetch(): Promise<Worktree[]> {
		const thisSeq = ++seq;
		loading = true;
		error = null;

		try {
			const result = await api.worktrees();
			if (thisSeq === seq) {
				list = result;
				loaded = true;
				loading = false;
			}
			return result;
		} catch (err) {
			if (thisSeq === seq) {
				error = err instanceof Error ? err.message : String(err);
				loading = false;
			}
			return [];
		}
	},

	async add(
		path: string,
		branch?: string | null,
		newBranch?: string | null,
		detach?: boolean
	): Promise<Worktree | null> {
		busy = true;
		actionError = null;

		try {
			const created = await api.worktreeAdd(path, branch, newBranch, detach);
			await this.fetch();
			busy = false;
			return created;
		} catch (err) {
			actionError = err instanceof Error ? err.message : String(err);
			busy = false;
			throw err;
		}
	},

	async remove(path: string, force = false): Promise<boolean> {
		busy = true;
		actionError = null;

		try {
			await api.worktreeRemove(path, force);
			await this.fetch();
			busy = false;
			return true;
		} catch (err) {
			actionError = err instanceof Error ? err.message : String(err);
			busy = false;
			throw err;
		}
	},

	async lock(path: string, reason?: string | null): Promise<boolean> {
		busy = true;
		actionError = null;

		try {
			await api.worktreeLock(path, reason);
			await this.fetch();
			busy = false;
			return true;
		} catch (err) {
			actionError = err instanceof Error ? err.message : String(err);
			busy = false;
			throw err;
		}
	},

	async unlock(path: string): Promise<boolean> {
		busy = true;
		actionError = null;

		try {
			await api.worktreeUnlock(path);
			await this.fetch();
			busy = false;
			return true;
		} catch (err) {
			actionError = err instanceof Error ? err.message : String(err);
			busy = false;
			throw err;
		}
	},

	async prune(): Promise<boolean> {
		busy = true;
		actionError = null;

		try {
			await api.worktreePrune();
			await this.fetch();
			busy = false;
			return true;
		} catch (err) {
			actionError = err instanceof Error ? err.message : String(err);
			busy = false;
			throw err;
		}
	},

	reset(): void {
		list = [];
		loaded = false;
		loading = false;
		error = null;
		busy = false;
		actionError = null;
		seq = 0;
	}
};
