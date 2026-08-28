// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The two things on the graph that are not commits: the WIP node and the
 * stashes.
 *
 * # Why they are an overlay rather than rows
 *
 * The walk produces commits, indexed, and every row's position is
 * `index × pitch`. That indexing is what makes the list virtualizable and what
 * keeps the lane canvas and the rows from drifting apart. Inserting a stash
 * into the middle of it would renumber every row below — on every stash push,
 * against a walk that is still streaming — for two or three entries.
 *
 * So they are drawn *against* the commit list instead of inside it:
 *
 * - The **WIP node** sits above row zero, in its own strip. It is genuinely
 *   above the newest commit in time, so a strip pinned to the top of the
 *   scroller is not a compromise — it is where it belongs.
 * - A **stash** is drawn on the row of the commit it was made on, offset to the
 *   right of that commit's node with a short connector. A stash *is* a commit
 *   whose first parent is that commit, so this says exactly what it is, and it
 *   needs no index of its own.
 *
 * This is a deliberate departure from the handoff, which shows stashes as rows.
 * It is written down here rather than left to be discovered.
 */

import * as api from '../api';
import { repo } from '../repo.svelte';
import type { StashEntry } from '../types';

let stashes = $state<StashEntry[]>([]);
let error = $state<string | null>(null);

export const overlay = {
	get stashes(): StashEntry[] {
		return stashes;
	},
	get error(): string | null {
		return error;
	},

	/**
	 * The working copy's node, or null when there is nothing uncommitted.
	 *
	 * `staged` and `unstaged` are counted separately because they are what the
	 * node's two halves show, and because "3 changed" reads as a lie when all
	 * three are already staged and the commit button is what is wanted.
	 */
	get wip(): { staged: number; unstaged: number; total: number } | null {
		const { working, staged } = repo.counts;
		if (working === null) return null;

		const stagedCount = staged ?? 0;
		// `working` is distinct changed paths across both sides, so the unstaged
		// count is what is left after the staged ones — not a second total.
		const unstaged = Math.max(0, working - stagedCount);
		if (working === 0) return null;

		return { staged: stagedCount, unstaged, total: working };
	},

	/** Stashes made on a given commit, by that commit's id. */
	on(commitId: string): StashEntry[] {
		return stashes.filter((entry) => entry.parent === commitId);
	},

	/** Re-read the stash list. Called whenever the graph reloads. */
	async load(): Promise<void> {
		if (repo.info === null) {
			stashes = [];
			return;
		}
		try {
			stashes = await api.stashes();
			error = null;
		} catch (e) {
			// A stash list we cannot read means no markers, not a broken graph.
			stashes = [];
			error = String(e);
		}
	},

	clear(): void {
		stashes = [];
		error = null;
	}
};
