// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The repositories GitLumiere has been shown.
 *
 * Every card is read where the repository sits, without opening it as the
 * current one. Nothing here scans the filesystem: the list is what the user
 * opened, in the order they last opened it.
 */

import * as api from '../api';
import { repo } from '../repo.svelte';
import type { RepoSummary } from '../types';

let cards = $state<RepoSummary[]>([]);
let loaded = $state(false);
let loading = $state(false);
let error = $state<string | null>(null);
/**
 * What the last write failed with, kept apart from `error`.
 *
 * Every write is followed by a re-read, and a successful re-read clears
 * `error` — so a failure recorded there would be wiped by the reload that
 * reports it.
 */
let writeError = $state<string | null>(null);
let busy = $state(false);

let seq = 0;

export const repos = {
	get cards(): RepoSummary[] {
		return cards;
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
	get writeError(): string | null {
		return writeError;
	},
	get busy(): boolean {
		return busy;
	},

	/** The ones with something going on, which is what the screen leads with. */
	get needingAttention(): RepoSummary[] {
		return cards.filter(
			(card) =>
				!card.present ||
				(card.conflicts ?? 0) > 0 ||
				(card.dirty ?? 0) > 0 ||
				(card.stashes ?? 0) > 0
		);
	},

	/** Everything else: present, clean, nothing put aside. */
	get idle(): RepoSummary[] {
		const busyOnes = new Set(this.needingAttention.map((card) => card.path));
		return cards.filter((card) => !busyOnes.has(card.path));
	},

	/** True for the repository currently open, so its card can say so. */
	isOpen(card: RepoSummary): boolean {
		return repo.info?.path === card.path;
	},

	async load(): Promise<void> {
		loading = true;
		const current = ++seq;
		try {
			const next = await api.recentRepos();
			if (current !== seq) return;
			cards = next;
			loaded = true;
			error = null;
		} catch (e) {
			if (current === seq) {
				error = String(e);
				cards = [];
			}
		} finally {
			if (current === seq) loading = false;
		}
	},

	/** Open a repository. Refuses a card whose path is gone. */
	async open(card: RepoSummary): Promise<boolean> {
		if (busy || !card.present) return false;
		busy = true;
		writeError = null;
		try {
			return await repo.open(card.path);
		} finally {
			busy = false;
			await this.load();
		}
	},

	/**
	 * Ask the user for a directory and open it. Opening is the only way a
	 * repository joins the list.
	 */
	async choose(): Promise<boolean> {
		if (busy) return false;
		busy = true;
		writeError = null;
		try {
			return await repo.choose();
		} finally {
			busy = false;
			await this.load();
		}
	},

	/** Remove a card from the list. The directory on disk is not touched. */
	async forget(card: RepoSummary): Promise<void> {
		if (busy) return;
		busy = true;
		writeError = null;
		try {
			await api.forgetRepo(card.path);
		} catch (e) {
			writeError = String(e);
		} finally {
			busy = false;
			await this.load();
		}
	},

	clear(): void {
		seq += 1;
		cards = [];
		loaded = false;
		loading = false;
		error = null;
		writeError = null;
		busy = false;
	}
};
