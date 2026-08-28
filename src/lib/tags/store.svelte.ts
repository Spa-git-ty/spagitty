// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Tags, gathered in one place (FEAT-051).
 *
 * Creating and deleting has been possible since FEAT-022, from the graph's
 * context menu — which meant you could only do either while already looking at
 * the commit it was about. That is backwards for the question people have,
 * which is "what versions are there", and it left annotated messages nowhere
 * to be read.
 *
 * The filter is local, over name, message and summary. The list is short by the
 * standards of everything else in this application, and a round trip per
 * keystroke to filter something already in hand would buy nothing.
 */

import * as api from '../api';
import { repo } from '../repo.svelte';
import type { Tag } from '../types';

let list = $state<Tag[]>([]);
let loaded = $state(false);
let loading = $state(false);
let error = $state<string | null>(null);

let query = $state('');

/** The create form. */
let newName = $state('');
let newTarget = $state('');
let newMessage = $state('');

let busy = $state(false);
let writeError = $state<string | null>(null);

/** Superseded reads are dropped rather than rendered over a newer one. */
let seq = 0;

export const tags = {
	get list(): Tag[] {
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
	get query(): string {
		return query;
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
	get newTarget(): string {
		return newTarget;
	},
	get newMessage(): string {
		return newMessage;
	},

	/** The tags after the filter. */
	get filtered(): Tag[] {
		const needle = query.trim().toLowerCase();
		if (needle === '') return list;

		return list.filter(
			(tag) =>
				tag.name.toLowerCase().includes(needle) ||
				tag.message.toLowerCase().includes(needle) ||
				tag.summary.toLowerCase().includes(needle)
		);
	},

	get hidden(): number {
		return list.length - this.filtered.length;
	},

	/**
	 * True when the form describes a tag that could be made.
	 *
	 * A name already in use is caught here: git's own refusal is
	 * `tag 'v1' already exists`, which is fine, but catching it means the
	 * button is dead rather than the click being wasted.
	 */
	get creatable(): boolean {
		const name = newName.trim();
		return !busy && name !== '' && !list.some((tag) => tag.name === name);
	},

	setQuery(next: string): void {
		query = next;
	},
	setNewName(next: string): void {
		newName = next;
	},
	setNewTarget(next: string): void {
		newTarget = next;
	},
	setNewMessage(next: string): void {
		newMessage = next;
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
			const next = await api.tags();
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

	/** Run a write, then re-read the list. */
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

	/** Create the tag the form describes. Clears the form on success. */
	async create(): Promise<boolean> {
		if (!this.creatable) return false;

		const name = newName.trim();
		const target = newTarget.trim();
		const message = newMessage.trim();

		const made = await this.run(() => api.tagCreate(name, target, message));
		if (made) {
			newName = '';
			newTarget = '';
			newMessage = '';
		}
		return made;
	},

	/** Delete a tag. The confirmation belongs to the caller. */
	remove(name: string): Promise<boolean> {
		return this.run(() => api.tagDelete(name));
	},

	/**
	 * Rewrite an annotated tag's message.
	 *
	 * Refused for an empty message here as well as in the core: this operation
	 * deletes before it creates, and an empty message would leave no tag at all.
	 */
	retag(name: string, target: string, message: string): Promise<boolean> {
		if (message.trim() === '') return Promise.resolve(false);
		return this.run(() => api.tagRetag(name, target, message.trim()));
	},

	/** Check a tag out, with no branch attached. */
	checkout(name: string): Promise<boolean> {
		return this.run(() => api.checkoutDetached(name));
	},

	clear(): void {
		seq += 1;
		list = [];
		loaded = false;
		loading = false;
		error = null;
		query = '';
		newName = '';
		newTarget = '';
		newMessage = '';
		busy = false;
		writeError = null;
	}
};
