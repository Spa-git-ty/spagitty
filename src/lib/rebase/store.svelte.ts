// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Planning a history rewrite.
 *
 * The edits *are* the state. There is no separate model of "what the result
 * looks like" — the preview is recomputed from the plan after every change, so
 * the two cannot disagree about what would happen.
 *
 * Nothing here executes anything. There is no command that could: `Apply` is
 * FEAT-015, and it renders disabled with that written on it.
 */

import * as api from '../api';
import type { RebaseAction, RebaseEdit, RebasePreview, RebaseTodo, TodoRow } from '../types';

let todo = $state<RebaseTodo | null>(null);
let plan = $state<RebaseEdit[]>([]);
let preview = $state<RebasePreview | null>(null);

let upstream = $state('');
let loading = $state(false);
let error = $state<string | null>(null);

/** The row the keyboard is on, by id. Reordering follows it. */
let focused = $state<string | null>(null);

/** Guards against a slow preview landing after a newer edit. */
let previewSeq = 0;

/** The todo rows by id, so a plan entry can find what it is about. */
function rowFor(id: string): TodoRow | null {
	return todo?.rows.find((row) => row.id === id) ?? null;
}

function positionOf(id: string): number {
	return plan.findIndex((entry) => entry.id === id);
}

export const rebase = {
	get todo(): RebaseTodo | null {
		return todo;
	},
	get plan(): RebaseEdit[] {
		return plan;
	},
	get preview(): RebasePreview | null {
		return preview;
	},
	get upstream(): string {
		return upstream;
	},
	set upstream(value: string) {
		upstream = value;
	},
	get loading(): boolean {
		return loading;
	},
	get error(): string | null {
		return error;
	},
	get focused(): string | null {
		return focused;
	},

	/** True once a todo has been read, so an untouched screen is not "empty". */
	get loaded(): boolean {
		return todo !== null;
	},

	/** The plan as rows, in plan order, each with its action. */
	get rows(): Array<{ row: TodoRow; action: RebaseAction }> {
		const out: Array<{ row: TodoRow; action: RebaseAction }> = [];
		for (const entry of plan) {
			const row = rowFor(entry.id);
			if (row) out.push({ row, action: entry.action });
		}
		return out;
	},

	/** True when the plan differs from the list git would have opened. */
	get edited(): boolean {
		if (!todo) return false;
		if (plan.length !== todo.rows.length) return true;
		return plan.some(
			(entry, at) => entry.action !== 'pick' || entry.id !== todo!.rows[at].id
		);
	},

	rowFor,

	/** Read the todo for `upstream` and start from an unedited plan. */
	async load(): Promise<void> {
		const onto = upstream.trim();
		if (onto === '') return;

		loading = true;
		try {
			const next = await api.rebaseTodo(onto);
			todo = next;
			plan = next.rows.map((row) => ({ id: row.id, action: 'pick' as const }));
			focused = next.rows[0]?.id ?? null;
			error = null;
			await this.recompute();
		} catch (e) {
			error = String(e);
			todo = null;
			plan = [];
			preview = null;
			focused = null;
		} finally {
			loading = false;
		}
	},

	/** Set one row's action. */
	async setAction(id: string, action: RebaseAction): Promise<void> {
		const at = positionOf(id);
		if (at === -1) return;
		plan[at] = { id, action };
		plan = [...plan];
		await this.recompute();
	},

	/**
	 * Move a row by `by` places. Works from the keyboard as well as by drag,
	 * because drag alone is untestable headlessly and unusable for some people.
	 */
	async move(id: string, by: number): Promise<void> {
		const from = positionOf(id);
		if (from === -1) return;
		const to = from + by;
		if (to < 0 || to >= plan.length) return;

		const next = [...plan];
		const [moved] = next.splice(from, 1);
		next.splice(to, 0, moved);
		plan = next;
		focused = id;
		await this.recompute();
	},

	focus(id: string | null): void {
		focused = id;
	},

	/** Put the plan back to the list git would have opened. */
	async reset(): Promise<void> {
		if (!todo) return;
		plan = todo.rows.map((row) => ({ id: row.id, action: 'pick' as const }));
		await this.recompute();
	},

	/** Recompute the preview. Called after every change; the last one wins. */
	async recompute(): Promise<void> {
		const current = ++previewSeq;
		try {
			const next = await api.rebasePreview(plan);
			if (current !== previewSeq) return;
			preview = next;
		} catch (e) {
			if (current === previewSeq) {
				error = String(e);
				preview = null;
			}
		}
	},

	clear(): void {
		previewSeq += 1;
		todo = null;
		plan = [];
		preview = null;
		upstream = '';
		loading = false;
		error = null;
		focused = null;
	}
};

/**
 * What each action does, in one line, for the chip's title.
 *
 * Exported because the component and its tests both need it, and a label that
 * only exists inside markup cannot be tested at all.
 */
export const ACTION_MEANINGS: Record<RebaseAction, string> = {
	pick: 'Keep this commit as it is.',
	squash: 'Fold this commit into the one above it.',
	reword: 'Keep the change; git asks for a new message when the rebase runs.',
	drop: 'Leave this commit out of the result entirely.'
};

/** The actions in the order the chips offer them. */
export const ACTIONS: RebaseAction[] = ['pick', 'squash', 'reword', 'drop'];
