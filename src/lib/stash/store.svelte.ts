// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Stash entries, and what is in the selected one.
 *
 * The list is one call. What an entry contains is `commitDiff` on the entry's
 * own id — a stash is a commit, so the Diff screen's machinery answers the
 * question without a second implementation.
 */

import * as api from '../api';
import * as act from '../graph/actions';
import { repo } from '../repo.svelte';
import type { CommitDiff, StashAction, StashEntry } from '../types';

let entries = $state<StashEntry[]>([]);
let loaded = $state(false);
let loading = $state(false);
let error = $state<string | null>(null);

let selected = $state<string | null>(null);
let contents = $state<CommitDiff | null>(null);
let contentsError = $state<string | null>(null);
let contentsLoading = $state(false);

/** The message a new stash would carry, and whether to take untracked files. */
let message = $state('');
let includeUntracked = $state(false);

let busy = $state(false);
let writeError = $state<string | null>(null);

let listSeq = 0;
let contentsSeq = 0;

export const stash = {
	get entries(): StashEntry[] {
		return entries;
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
	get selected(): StashEntry | null {
		return entries.find((entry) => entry.id === selected) ?? null;
	},
	get contents(): CommitDiff | null {
		return contents;
	},
	get contentsError(): string | null {
		return contentsError;
	},
	get contentsLoading(): boolean {
		return contentsLoading;
	},
	get message(): string {
		return message;
	},
	get includeUntracked(): boolean {
		return includeUntracked;
	},
	get busy(): boolean {
		return busy;
	},
	get writeError(): string | null {
		return writeError;
	},

	setMessage(next: string) {
		message = next;
	},
	setIncludeUntracked(next: boolean) {
		includeUntracked = next;
	},

	async load(): Promise<void> {
		loading = true;
		const seq = ++listSeq;
		try {
			const next = await api.stashes();
			if (seq !== listSeq) return;

			entries = next;
			loaded = true;
			error = null;

			// Keep the open entry if it survived; otherwise open the newest.
			const keep = next.find((entry) => entry.id === selected);
			if (keep) this.select(keep.id, true);
			else if (next.length > 0) this.select(next[0].id);
			else this.deselect();
		} catch (e) {
			if (seq === listSeq) {
				error = String(e);
				entries = [];
				this.deselect();
			}
		} finally {
			if (seq === listSeq) loading = false;
		}
	},

	/** Open an entry and read what is in it. */
	select(id: string, force = false): void {
		if (!force && selected === id) return;

		selected = id;
		contents = null;
		contentsError = null;
		contentsLoading = true;

		const seq = ++contentsSeq;
		api
			.commitDiff(id)
			.then((result) => {
				if (seq !== contentsSeq) return;
				contents = result;
				contentsLoading = false;
			})
			.catch((e) => {
				if (seq !== contentsSeq) return;
				contentsError = String(e);
				contentsLoading = false;
			});
	},

	deselect(): void {
		contentsSeq += 1;
		selected = null;
		contents = null;
		contentsError = null;
		contentsLoading = false;
	},

	/** Stash the working copy, then re-read the list and the rail. */
	async push(): Promise<boolean> {
		if (busy) return false;
		busy = true;
		writeError = null;
		try {
			await api.stashPush(message, includeUntracked);
			message = '';
			return true;
		} catch (e) {
			writeError = String(e);
			return false;
		} finally {
			busy = false;
			await this.load();
			await repo.refresh();
		}
	},

	/**
	 * Pop, apply or drop the selected entry, then re-read the list (FEAT-014).
	 *
	 * The confirmation and the write itself live in `graph/actions.ts`, not
	 * here: that module's argument is that the sentence shown before a
	 * destructive operation is as much a part of it as the command, and a second
	 * screen offering the same operation must not write a second sentence. What
	 * this adds is the part `actions` cannot know about — the list on *this*
	 * screen is now stale, and `perform`'s own refresh reaches the graph and the
	 * rail but not here.
	 *
	 * Pop and drop remove the entry, so the selection is released before the
	 * re-read rather than pointing at something that no longer exists.
	 */
	async restore(action: StashAction): Promise<void> {
		const entry = this.selected;
		if (!entry || busy) return;

		busy = true;
		try {
			const changed = await act.stash(entry.index, entry.name, action);
			if (!changed) return;

			if (action !== 'apply') this.deselect();
			await this.load();
			await repo.refresh();
		} finally {
			busy = false;
		}
	},

	clear(): void {
		listSeq += 1;
		contentsSeq += 1;
		entries = [];
		loaded = false;
		loading = false;
		error = null;
		selected = null;
		contents = null;
		contentsError = null;
		contentsLoading = false;
		message = '';
		includeUntracked = false;
		busy = false;
		writeError = null;
	}
};
