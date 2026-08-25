// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Where a ref has been (FEAT-050).
 *
 * A read-mostly store: the reflog itself is never written, only read, and the
 * three ways out of an entry are ordinary writes that live elsewhere — a branch
 * created at it, a checkout, a reset.
 *
 * The filter is a plain substring over the operation and the message, applied
 * here rather than in the backend. A reflog is capped at 500 entries by the
 * time it arrives, and refetching on every keystroke to filter a list that is
 * already in hand would be a round trip for nothing.
 */

import * as api from '../api';
import { repo } from '../repo.svelte';
import type { Reflog, ReflogEntry } from '../types';

/** What one read asks for. Matches the core's own cap. */
const LIMIT = 500;

let log = $state<Reflog | null>(null);
let refs = $state<string[]>([]);
/** Which ref is being looked at. Empty means HEAD. */
let reference = $state('');
let loaded = $state(false);
let loading = $state(false);
let error = $state<string | null>(null);

let query = $state('');

/** Set while a recovery write is in flight. */
let busy = $state(false);
let writeError = $state<string | null>(null);

/** Superseded reads are dropped rather than rendered over a newer one. */
let seq = 0;

export const reflog = {
	get log(): Reflog | null {
		return log;
	},
	get refs(): string[] {
		return refs;
	},
	get reference(): string {
		return reference;
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
	get query(): string {
		return query;
	},
	get busy(): boolean {
		return busy;
	},
	get writeError(): string | null {
		return writeError;
	},

	/** The entries after the filter, newest first. */
	get entries(): ReflogEntry[] {
		const entries = log?.entries ?? [];
		const needle = query.trim().toLowerCase();
		if (needle === '') return entries;

		return entries.filter(
			(entry) =>
				entry.operation.toLowerCase().includes(needle) ||
				entry.message.toLowerCase().includes(needle)
		);
	},

	/** How many entries the filter is hiding. */
	get hidden(): number {
		return (log?.entries.length ?? 0) - this.entries.length;
	},

	/**
	 * True when the repository keeps no reflog for this ref.
	 *
	 * Kept apart from "no entries": a repository with `core.logAllRefUpdates`
	 * off has nothing to show and never will, which is a different sentence
	 * from a ref that simply has not moved yet.
	 */
	get absent(): boolean {
		return loaded && log !== null && !log.exists;
	},

	setQuery(next: string): void {
		query = next;
	},

	/** Look at another ref's log. Reads immediately; the list is short. */
	async show(next: string): Promise<void> {
		reference = next;
		await this.load();
	},

	async load(): Promise<void> {
		if (!api.inTauri() || repo.info === null) {
			log = null;
			refs = [];
			loaded = true;
			return;
		}

		const current = ++seq;
		loading = true;
		try {
			const [next, names] = await Promise.all([
				api.reflog(reference, LIMIT),
				api.reflogRefs()
			]);
			if (current !== seq) return;
			log = next;
			refs = names;
			loaded = true;
			error = null;
		} catch (e) {
			if (current === seq) {
				error = String(e);
				log = null;
			}
		} finally {
			if (current === seq) loading = false;
		}
	},

	/**
	 * Run a recovery write, then re-read.
	 *
	 * Recovering from an entry adds to the reflog itself — a branch created, a
	 * checkout, a reset are all moves — so the list after the write is not the
	 * list before it plus nothing.
	 */
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
			await repo.refresh();
		}
	},

	/** Create a branch at an entry — the recovery that loses nothing. */
	branchAt(name: string, id: string): Promise<boolean> {
		if (name.trim() === '') return Promise.resolve(false);
		return this.run(() => api.createBranch(name.trim(), id, false));
	},

	/** Check an entry out, with no branch attached. */
	checkoutAt(id: string): Promise<boolean> {
		return this.run(() => api.checkoutDetached(id));
	},

	/** Move the current branch to an entry, discarding what is in the way. */
	resetTo(id: string): Promise<boolean> {
		return this.run(() => api.reset(id, 'hard'));
	},

	clear(): void {
		seq += 1;
		log = null;
		refs = [];
		reference = '';
		loaded = false;
		loading = false;
		error = null;
		query = '';
		busy = false;
		writeError = null;
	}
};
