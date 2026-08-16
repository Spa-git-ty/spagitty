// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * A repository stopped mid-operation.
 *
 * Reads only. There is no write path here at all — taking a side, editing the
 * merged result and marking a file resolved are FEAT-016, and a disabled
 * control backed by nothing is easier to explain than one backed by a
 * half-written write path.
 */

import * as api from '../api';
import type { ConflictFile, ConflictOperation, ConflictSides } from '../types';

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
	 * A file that was resolved outside GitLord leaves the list while the screen
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
		await this.select(stillThere ? (openPath as string) : files[0].path, true);
	},

	/** Open a conflicted file. Re-selecting the open one does not re-read it. */
	async select(path: string, force = false): Promise<void> {
		if (!force && openPath === path) return;
		openPath = path;

		readingSides = true;
		const current = ++sidesSeq;
		try {
			const next = await api.conflictSides(path);
			if (current !== sidesSeq) return;
			sides = next;
			sidesError = null;
		} catch (e) {
			if (current === sidesSeq) {
				sidesError = String(e);
				sides = null;
			}
		} finally {
			if (current === sidesSeq) readingSides = false;
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
