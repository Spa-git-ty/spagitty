// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The remotes a repository knows about (FEAT-049).
 *
 * Fetch, push and pull have worked against existing remotes since FEAT-018;
 * adding, renaming or removing one meant a terminal. This is the store behind
 * the Settings section that closes that.
 *
 * Every write re-reads the list rather than patching it in place. Renaming a
 * remote moves refs and rewrites upstreams, removing one takes tracking refs
 * with it, and neither is something a local edit could model correctly.
 */

import * as api from '../api';
import { repo } from '../repo.svelte';
import type { Remote } from '../types';

let list = $state<Remote[]>([]);
let loaded = $state(false);
let loading = $state(false);
let error = $state<string | null>(null);

/** Set while a write is in flight, so nothing is done twice. */
let busy = $state(false);
let writeError = $state<string | null>(null);

/** The add form. */
let newName = $state('');
let newUrl = $state('');

/** Superseded reads are dropped rather than rendered over a newer one. */
let seq = 0;

export const remotes = {
	get list(): Remote[] {
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
	get writeError(): string | null {
		return writeError;
	},
	get newName(): string {
		return newName;
	},
	get newUrl(): string {
		return newUrl;
	},

	/**
	 * True when the add form describes a remote that could exist.
	 *
	 * A name that is already taken is caught here rather than by git, because
	 * git's message for it names the config key and not the remote.
	 */
	get addable(): boolean {
		const name = newName.trim();
		return (
			!busy &&
			name !== '' &&
			newUrl.trim() !== '' &&
			!/[\s/]/.test(name) &&
			!list.some((remote) => remote.name === name)
		);
	},

	setNewName(next: string): void {
		newName = next;
	},
	setNewUrl(next: string): void {
		newUrl = next;
	},

	async load(): Promise<void> {
		if (!api.inTauri() || repo.info === null) {
			list = [];
			loaded = true;
			return;
		}

		const current = ++seq;
		loading = true;
		try {
			const next = await api.remotes();
			if (current !== seq) return;
			list = next;
			loaded = true;
			error = null;
		} catch (e) {
			if (current === seq) {
				error = String(e);
				list = [];
			}
		} finally {
			if (current === seq) loading = false;
		}
	},

	/** Run a write, then re-read the list it could have changed. */
	async run(operation: () => Promise<void>): Promise<boolean> {
		if (busy) return false;
		busy = true;
		writeError = null;
		try {
			await operation();
			return true;
		} catch (e) {
			writeError = String(e);
			return false;
		} finally {
			busy = false;
			await this.load();
		}
	},

	/** Add the remote the form describes. Clears the form on success. */
	async add(): Promise<boolean> {
		if (!this.addable) return false;

		const name = newName.trim();
		const url = newUrl.trim();
		const added = await this.run(() => api.remoteAdd(name, url));
		if (added) {
			newName = '';
			newUrl = '';
		}
		return added;
	},

	rename(from: string, to: string): Promise<boolean> {
		if (to.trim() === '' || to === from) return Promise.resolve(false);
		return this.run(() => api.remoteRename(from, to.trim()));
	},

	/** Remove a remote. The confirmation belongs to the caller. */
	remove(name: string): Promise<boolean> {
		return this.run(() => api.remoteRemove(name));
	},

	setUrl(name: string, url: string): Promise<boolean> {
		if (url.trim() === '') return Promise.resolve(false);
		return this.run(() => api.remoteSetUrl(name, url.trim()));
	},

	clear(): void {
		seq += 1;
		list = [];
		loaded = false;
		loading = false;
		error = null;
		busy = false;
		writeError = null;
		newName = '';
		newUrl = '';
	}
};
