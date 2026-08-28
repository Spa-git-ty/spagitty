// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * A repository stopped mid-operation.
 *
 * Reading was the whole of it until FEAT-016. It writes now, and the shape that
 * matters is the draft: the merged pane is editable, so there is text on screen
 * that is not on disk, and every path out of this store has to know that. A
 * draft that is silently dropped by moving to the next file is the exact failure
 * the item warned about, so `select` refuses to move while one is dirty and the
 * screen asks.
 *
 * Nothing here marks a file resolved on the user's behalf. Taking a side writes
 * the working file and leaves the index conflicted; `git add` is a separate,
 * deliberate act, and it is the only real check that the resolution was looked
 * at.
 */

import * as api from '../api';
import type {
	ConflictFile,
	ConflictOperation,
	ConflictRegion,
	ConflictSideName,
	ConflictSides
} from '../types';

let operation = $state<ConflictOperation>('none');
let files = $state<ConflictFile[]>([]);
let loaded = $state(false);
let loading = $state(false);
let error = $state<string | null>(null);

let openPath = $state<string | null>(null);
let sides = $state<ConflictSides | null>(null);
let sidesError = $state<string | null>(null);
let readingSides = $state(false);

/** Superseded reads are dropped rather than rendered over a newer one. */
let listSeq = 0;
let sidesSeq = 0;

/** The merged pane's text as it is being edited, or null when it is not. */
let draft = $state<string | null>(null);
/** The marker regions of whatever the merged pane is currently showing. */
let regions = $state<ConflictRegion[]>([]);
/** Set while a write is in flight, so nothing is done twice. */
let busy = $state(false);
/** What the last write failed with. Cleared when the next one starts. */
let writeError = $state<string | null>(null);

/** What each operation is called where the screen has to name it. */
const OPERATION_LABELS: Record<ConflictOperation, string> = {
	merge: 'merge',
	rebase: 'rebase',
	rebaseInteractive: 'interactive rebase',
	cherryPick: 'cherry-pick',
	revert: 'revert',
	applyMailbox: 'patch application',
	bisect: 'bisect',
	none: 'none'
};

export const conflicts = {
	get operation(): ConflictOperation {
		return operation;
	},
	get operationLabel(): string {
		return OPERATION_LABELS[operation];
	},
	get files(): ConflictFile[] {
		return files;
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
	get openPath(): string | null {
		return openPath;
	},
	get sides(): ConflictSides | null {
		return sides;
	},
	get sidesError(): string | null {
		return sidesError;
	},
	get readingSides(): boolean {
		return readingSides;
	},

	/** Where the open file sits in the pager, 1-based. 0 when nothing is open. */
	get position(): number {
		if (!openPath) return 0;
		return files.findIndex((file) => file.path === openPath) + 1;
	},

	async load(): Promise<void> {
		loading = true;
		const current = ++listSeq;
		try {
			const next = await api.conflicts();
			if (current !== listSeq) return;
			operation = next.operation;
			files = next.files;
			loaded = true;
			error = null;
			await this.reconcileSelection();
		} catch (e) {
			if (current === listSeq) {
				error = String(e);
				files = [];
				operation = 'none';
				openPath = null;
				sides = null;
			}
		} finally {
			if (current === listSeq) loading = false;
		}
	},

	/**
	 * Keep the pager pointing at something real after a reload.
	 *
	 * A file that was resolved outside Spagitty leaves the list while the screen
	 * is open. Staying on it would show three sides of a file that is no longer
	 * conflicted, so the selection falls back to the first remaining file.
	 */
	async reconcileSelection(): Promise<void> {
		if (files.length === 0) {
			openPath = null;
			sides = null;
			sidesError = null;
			return;
		}
		const stillThere = openPath !== null && files.some((file) => file.path === openPath);

		// A dirty draft survives a reload of the file it belongs to. Re-reading
		// the sides underneath it would replace the text the person is editing
		// with what is on disk, which is the silent discard this store exists to
		// avoid — and a plain Refresh must not be a way to lose an edit.
		if (stillThere && this.dirty) return;

		await this.select(stillThere ? (openPath as string) : files[0].path, true);
	},

	/**
	 * Open a conflicted file. Re-selecting the open one does not re-read it.
	 *
	 * Refuses to move away from a dirty draft. The screen asks first, and a
	 * store that moved anyway would be the silent discard the item warned
	 * about — `force` is how the screen says the user has answered.
	 */
	async select(path: string, force = false): Promise<void> {
		if (!force && openPath === path) return;
		if (!force && this.dirty && openPath !== path) return;

		openPath = path;
		draft = null;
		regions = [];

		readingSides = true;
		const current = ++sidesSeq;
		try {
			const next = await api.conflictSides(path);
			if (current !== sidesSeq) return;
			sides = next;
			sidesError = null;
			await this.refreshRegions();
		} catch (e) {
			if (current === sidesSeq) {
				sidesError = String(e);
				sides = null;
			}
		} finally {
			if (current === sidesSeq) readingSides = false;
		}
	},

	/** The merged pane's text as it is being edited, or null when it is not. */
	get draft(): string | null {
		return draft;
	},
	/** True when there is text on screen that is not on disk. */
	get dirty(): boolean {
		return draft !== null && draft !== (sides?.merged?.text ?? '');
	},
	/** The marker regions of the file that is open. */
	get regions(): ConflictRegion[] {
		return regions;
	},
	get busy(): boolean {
		return busy;
	},
	get writeError(): string | null {
		return writeError;
	},
	/** True when every conflicted path has been marked resolved. */
	get allResolved(): boolean {
		return loaded && files.length === 0 && operation !== 'none';
	},

	/** Start editing the merged pane, from what is on disk right now. */
	edit(): void {
		if (draft === null) draft = sides?.merged?.text ?? '';
	},

	setDraft(next: string): void {
		draft = next;
	},

	/** Throw the draft away and go back to what is on disk. */
	discardDraft(): void {
		draft = null;
	},

	/**
	 * Run a write, then re-read everything it could have changed.
	 *
	 * The list, the open file's three sides and the regions all move when a
	 * resolution lands, and re-reading is cheaper than working out which.
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
		}
	},

	/** Take one whole side of the open file. The draft goes with it. */
	take(side: ConflictSideName): Promise<boolean> {
		const path = openPath;
		if (path === null) return Promise.resolve(false);

		draft = null;
		return this.run(() => api.conflictTake(path, side));
	},

	/**
	 * Resolve one marker region, or every one when `index` is null.
	 *
	 * A dirty draft is saved first. Resolving a region works on the file, and
	 * the regions the screen is pointing at are the ones in the text it is
	 * showing — writing that text down first is what keeps the two the same.
	 */
	async resolveRegion(index: number | null, side: ConflictSideName): Promise<boolean> {
		const path = openPath;
		if (path === null) return false;

		if (this.dirty) {
			const saved = await this.save();
			if (!saved) return false;
		}

		draft = null;
		return this.run(() => api.conflictResolveRegion(path, index, side));
	},

	/** Write the draft to the file. */
	async save(): Promise<boolean> {
		const path = openPath;
		if (path === null || draft === null) return false;

		const text = draft;
		const written = await this.run(() => api.conflictWrite(path, text));
		if (written) draft = null;
		return written;
	},

	/** Mark the open file resolved: `git add`. */
	markResolved(): Promise<boolean> {
		const path = openPath;
		if (path === null) return Promise.resolve(false);

		draft = null;
		return this.run(() => api.conflictResolve([path]));
	},

	/** Carry on with the operation. Refused by git while anything is conflicted. */
	continue(): Promise<boolean> {
		return this.run(() => api.conflictContinue());
	},

	/** Abandon it. The confirmation belongs to the caller. */
	abort(): Promise<boolean> {
		draft = null;
		return this.run(() => api.conflictAbort());
	},

	/** Re-read the marker regions of whatever the merged pane is showing. */
	async refreshRegions(): Promise<void> {
		const text = draft ?? sides?.merged?.text ?? '';
		const current = sidesSeq;
		try {
			const next = await api.conflictRegions(text);
			if (current === sidesSeq) regions = next;
		} catch {
			// A file that cannot be parsed has no regions to offer. The whole-file
			// controls still work, and they are the ones that matter.
			if (current === sidesSeq) regions = [];
		}
	},

	/** Move through the pager. `step` is +1 or −1; the ends do not wrap. */
	async step(by: number): Promise<void> {
		if (files.length === 0 || openPath === null) return;
		const at = files.findIndex((file) => file.path === openPath);
		const next = at + by;
		if (next < 0 || next >= files.length) return;
		await this.select(files[next].path);
	},

	clear(): void {
		listSeq += 1;
		sidesSeq += 1;
		operation = 'none';
		files = [];
		loaded = false;
		loading = false;
		error = null;
		openPath = null;
		sides = null;
		sidesError = null;
		readingSides = false;
		draft = null;
		regions = [];
		busy = false;
		writeError = null;
	}
};

/**
 * What a conflict kind means for the side that is missing, in the words the
 * pane uses. Exported because the pane and its tests both need it, and a label
 * that only exists inside markup cannot be tested at all.
 */
export function missingSideReason(
	kind: ConflictFile['kind'],
	side: 'base' | 'ours' | 'theirs'
): string {
	if (side === 'base' && kind === 'bothAdded') {
		return 'No common ancestor — both sides added this file.';
	}
	if (side === 'ours' && kind === 'deletedByUs') {
		return 'Deleted on this side.';
	}
	if (side === 'theirs' && kind === 'deletedByThem') {
		return 'Deleted on the incoming side.';
	}
	return 'Not present on this side.';
}
