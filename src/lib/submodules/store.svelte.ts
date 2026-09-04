// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Git submodules store (FEAT-067).
 *
 * Manages reactive state for repository submodules, supporting listing status,
 * recursive initialization/updates, URL synchronization, and de-initialization.
 */

import * as api from '../api';
import type { Submodule } from '../types';

let list = $state<Submodule[]>([]);
let loaded = $state(false);
let loading = $state(false);
let error = $state<string | null>(null);
let busy = $state(false);
let actionOutput = $state<string | null>(null);
let actionError = $state<string | null>(null);

let seq = 0;

export const submodules = {
	get list(): Submodule[] {
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
	get actionOutput(): string | null {
		return actionOutput;
	},
	get actionError(): string | null {
		return actionError;
	},

	get count(): number {
		return list.length;
	},

	get uninitializedCount(): number {
		return list.filter((s) => !s.initialized).length;
	},

	get driftedCount(): number {
		return list.filter((s) => s.initialized && !s.inSync).length;
	},

	async fetch(): Promise<Submodule[]> {
		const thisSeq = ++seq;
		loading = true;
		error = null;

		try {
			const result = await api.submodules();
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

	async update(paths: string[] = [], init = true, recursive = true): Promise<string> {
		busy = true;
		actionError = null;
		actionOutput = null;

		try {
			const output = await api.submoduleUpdate(paths, init, recursive);
			actionOutput = output;
			await this.fetch();
			busy = false;
			return output;
		} catch (err) {
			actionError = err instanceof Error ? err.message : String(err);
			busy = false;
			throw err;
		}
	},

	async sync(recursive = true): Promise<string> {
		busy = true;
		actionError = null;
		actionOutput = null;

		try {
			const output = await api.submoduleSync(recursive);
			actionOutput = output;
			await this.fetch();
			busy = false;
			return output;
		} catch (err) {
			actionError = err instanceof Error ? err.message : String(err);
			busy = false;
			throw err;
		}
	},

	async deinit(path: string, force = false): Promise<string> {
		busy = true;
		actionError = null;
		actionOutput = null;

		try {
			const output = await api.submoduleDeinit(path, force);
			actionOutput = output;
			await this.fetch();
			busy = false;
			return output;
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
		actionOutput = null;
		actionError = null;
		seq = 0;
	}
};
