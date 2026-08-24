// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The working copy: what is staged, what is not, and the message.
 *
 * One status walk fills both columns, and the hunks of the selected file are
 * fetched as it is selected — the same two-step shape the Diff screen uses,
 * for the same reason.
 *
 * Nothing here is cached across a write. Staging changes what every other row
 * means, so every write is followed by a fresh walk rather than by patching
 * the lists in place, which is how a UI ends up disagreeing with the index.
 */

import * as api from '../api';
import { repo } from '../repo.svelte';
import type { DiffSide, FileDiff, StatusEntry, WorkingCopy } from '../types';

/** Which file is open, and which side of the index it is being read from. */
export interface Selection {
	path: string;
	side: DiffSide;
}

const EMPTY: WorkingCopy = { staged: [], unstaged: [], conflicted: [] };

let work = $state<WorkingCopy>(EMPTY);
let loaded = $state(false);
let error = $state<string | null>(null);
let loading = $state(false);

let selection = $state<Selection | null>(null);
let file = $state<FileDiff | null>(null);
let fileError = $state<string | null>(null);
let fileLoading = $state(false);

let subject = $state('');
let body = $state('');
let amend = $state(false);

/** Set while a write is in flight, so a button cannot be pressed twice. */
let busy = $state(false);
/** What the last write failed with. Cleared when the next one starts. */
let writeError = $state<string | null>(null);

/** Guards against a slow fetch landing after a newer one. */
let workSeq = 0;
let fileSeq = 0;

function sameSelection(a: Selection | null, b: Selection | null): boolean {
	return a?.path === b?.path && a?.side === b?.side;
}

/** Is `selection` still a row that exists? */
function stillListed(next: WorkingCopy, current: Selection | null): boolean {
	if (current === null) return false;
	const list = current.side === 'staged' ? next.staged : next.unstaged;
	return list.some((entry) => entry.path === current.path);
}

export const changes = {
	get work(): WorkingCopy {
		return work;
	},
	/** True once a walk has completed, so an empty screen can tell why. */
	get loaded(): boolean {
		return loaded;
	},
	get error(): string | null {
		return error;
	},
	get loading(): boolean {
		return loading;
	},
	get selection(): Selection | null {
		return selection;
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
	get subject(): string {
		return subject;
	},
	get body(): string {
		return body;
	},
	get amend(): boolean {
		return amend;
	},
	get busy(): boolean {
		return busy;
	},
	get writeError(): string | null {
		return writeError;
	},

	/** True when there is something to commit and a subject to commit it under. */
	get canCommit(): boolean {
		if (busy || subject.trim() === '') return false;
		if (work.conflicted.length > 0) return false;
		// An amend can reword the previous commit without staging anything new.
		return work.staged.length > 0 || amend;
	},

	setSubject(next: string) {
		subject = next;
	},
	setBody(next: string) {
		body = next;
	},

	/**
	 * Turn amending on or off. Turning it on offers the previous message, since
	 * an amend that silently discarded it would be a reword nobody asked for.
	 */
	async setAmend(next: boolean): Promise<void> {
		amend = next;
		if (!next || subject.trim() !== '') return;

		try {
			const message = await api.headMessage();
			if (!amend || message === '') return;
			const [first, ...rest] = message.split('\n');
			subject = first;
			body = rest.join('\n').trim();
		} catch {
			// No previous message to offer; the boxes stay as they are.
		}
	},

	/** Re-read the working copy. Keeps the selection if its row survived. */
	async load(): Promise<void> {
		loading = true;
		const seq = ++workSeq;
		try {
			const next = await api.workingCopy();
			if (seq !== workSeq) return;

			work = next;
			loaded = true;
			error = null;

			if (stillListed(next, selection)) {
				// The row is still there but its hunks may not be.
				this.open(selection as Selection, true);
			} else {
				this.openFirst(next);
			}
		} catch (e) {
			if (seq === workSeq) {
				error = String(e);
				work = EMPTY;
				selection = null;
				file = null;
			}
		} finally {
			if (seq === workSeq) loading = false;
		}
	},

	/** Select the first row there is, or nothing when the copy is clean. */
	openFirst(next: WorkingCopy = work): void {
		const first: StatusEntry | undefined = next.unstaged[0] ?? next.staged[0];
		if (first === undefined) {
			selection = null;
			file = null;
			fileError = null;
			fileLoading = false;
			return;
		}
		const side: DiffSide = next.unstaged.includes(first) ? 'unstaged' : 'staged';
		this.open({ path: first.path, side });
	},

	/** Open a file's hunks. `force` re-fetches a selection that is already open. */
	open(next: Selection, force = false): void {
		if (!force && sameSelection(selection, next)) return;

		selection = next;
		file = null;
		fileError = null;
		fileLoading = true;

		const seq = ++fileSeq;
		api
			.workingDiff(next.path, next.side)
			.then((result) => {
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

	/** Run a write, then re-read everything it could have changed. */
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

	stage(paths: string[]): Promise<boolean> {
		return this.run(() => api.stage(paths));
	},

	unstage(paths: string[]): Promise<boolean> {
		return this.run(() => api.unstage(paths));
	},

	/**
	 * Throw away unstaged changes to whole paths.
	 *
	 * No confirmation here. `$lib/changes/discard.ts` owns the wording, because
	 * what the sentence has to say depends on what the paths are, and a store
	 * that asked as well would ask twice.
	 */
	discard(paths: string[]): Promise<boolean> {
		return this.run(() => api.discard(paths));
	},

	/**
	 * Throw away one hunk of the open file.
	 *
	 * Only from the unstaged side. On the staged side the hunk buttons unstage,
	 * which is not destructive, and there is nothing to discard until it has
	 * come back across.
	 */
	discardHunk(index: number, header: string): Promise<boolean> {
		const current = selection;
		if (current === null || current.side !== 'unstaged') return Promise.resolve(false);

		return this.run(() => api.discardHunk(current.path, index, header));
	},

	/** Stage or unstage one hunk of the open file, whichever side it is on. */
	hunk(index: number, header: string): Promise<boolean> {
		const current = selection;
		if (current === null) return Promise.resolve(false);

		return this.run(() =>
			current.side === 'unstaged'
				? api.stageHunk(current.path, index, header)
				: api.unstageHunk(current.path, index, header)
		);
	},

	/** Commit what is staged. Clears the message only if the commit happened. */
	async commit(): Promise<boolean> {
		if (!this.canCommit) return false;

		const committed = await this.run(async () => {
			await api.commit(subject, body, amend);
		});

		if (committed) {
			subject = '';
			body = '';
			amend = false;
		}
		return committed;
	},

	/** Forget everything. Called when the open repository changes. */
	clear(): void {
		workSeq += 1;
		fileSeq += 1;
		work = EMPTY;
		loaded = false;
		error = null;
		loading = false;
		selection = null;
		file = null;
		fileError = null;
		fileLoading = false;
		subject = '';
		body = '';
		amend = false;
		busy = false;
		writeError = null;
	}
};
