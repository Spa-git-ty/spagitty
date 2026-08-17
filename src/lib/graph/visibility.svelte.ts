// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Which branches the graph is showing, and which are pinned to the left.
 *
 * Repositories with hundreds of branches are the ordinary case, and a graph
 * that draws all of them is a graph nobody reads. The three controls the
 * handoff calls Hide, Solo and Smart Branch Visibility are all the same
 * question underneath — *which refs is the walk rooted at* — so this store
 * answers that once and the backend is told the answer rather than which
 * button was pressed.
 *
 * # Pinning is a different axis
 *
 * Hiding changes *what* is walked. Pinning changes *where* a branch is drawn:
 * its lane is held open on the left for the whole walk, so `main` stays where
 * the eye left it instead of drifting as other branches come and go. The two
 * compose — a pinned branch that is hidden is simply not there — and both
 * restart the walk, because lanes are assigned as the walk runs.
 *
 * # Persistence
 *
 * Per repository, in `localStorage`, for the reasons in `columns.svelte.ts`:
 * this is one person's view of one checkout, not a property of the repository.
 */

import * as api from '../api';
import { graph } from './store.svelte';
import { repo } from '../repo.svelte';
import type { BranchRow } from '../types';

/** What decides the walk's roots. */
export type Mode =
	/** Every local and remote branch. The default, and what git log --all does. */
	| 'all'
	/** Everything except `hidden`. */
	| 'hide'
	/** Only `soloed`. */
	| 'solo'
	/** The checked-out branch, its upstream, and the branch it is based on. */
	| 'smart';

interface Stored {
	mode: Mode;
	hidden: string[];
	soloed: string[];
	pinned: string[];
}

const KEY_PREFIX = 'gitlumiere.graph.visibility:';

let repoKey = $state<string | null>(null);
let mode = $state<Mode>('all');
let hidden = $state<string[]>([]);
let soloed = $state<string[]>([]);
let pinned = $state<string[]>([]);
/** The branch list the modes are computed against. Refreshed with the graph. */
let branches = $state<BranchRow[]>([]);

function persist(): void {
	if (repoKey === null) return;
	const stored: Stored = { mode, hidden, soloed, pinned };
	try {
		localStorage.setItem(KEY_PREFIX + repoKey, JSON.stringify(stored));
	} catch {
		// Not worth failing a paint over.
	}
}

function strings(value: unknown): string[] {
	return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function restore(key: string): void {
	let stored: Stored | null = null;
	try {
		const raw = localStorage.getItem(KEY_PREFIX + key);
		stored = raw === null ? null : (JSON.parse(raw) as Stored);
	} catch {
		stored = null;
	}

	mode =
		stored?.mode === 'hide' || stored?.mode === 'solo' || stored?.mode === 'smart'
			? stored.mode
			: 'all';
	hidden = strings(stored?.hidden);
	soloed = strings(stored?.soloed);
	pinned = strings(stored?.pinned);
}

/**
 * The refs the walk should be rooted at, for the current mode.
 *
 * An empty array means "everything", which is what the backend takes `all` to
 * be. Every other mode resolves to an explicit list, computed here rather than
 * in Rust because it is a question about the branch list the screen is already
 * holding, not about the repository.
 */
function roots(): string[] {
	switch (mode) {
		case 'all':
			return [];
		case 'hide': {
			const kept = branches
				.filter((branch) => !hidden.includes(branch.fullName))
				.map((branch) => branch.fullName);
			// Hiding everything is not a request to see nothing — it is a state
			// the user got into. Falling back to all is what the backend does
			// with an unresolvable list, and doing it here keeps them agreeing.
			return kept.length === branches.length ? [] : kept;
		}
		case 'solo':
			return soloed.length === 0 ? [] : [...soloed];
		case 'smart':
			return smartRoots();
	}
}

/**
 * Smart Branch Visibility: the branch you are on, and what it relates to.
 *
 * That is the checked-out branch, its upstream, and — as the closest usable
 * stand-in for "its target branch", which no git repository actually records —
 * the branch it is based on. GitLumiere takes that to be the current branch's
 * upstream where there is one, plus whichever local branch fully contains the
 * current branch's merge base, which in practice is `main` or `master`.
 *
 * The heuristic is stated rather than hidden, because a filter that silently
 * guesses wrong is one people stop trusting. When it can find nothing at all it
 * returns everything, which is visibly the wrong answer rather than an empty
 * screen that looks broken.
 */
function smartRoots(): string[] {
	const current = branches.find((branch) => branch.current);
	if (!current) return [];

	const wanted = new Set<string>([current.fullName]);

	if (current.upstream) {
		const upstream = branches.find(
			(branch) => branch.kind === 'remote' && branch.name === current.upstream
		);
		if (upstream) wanted.add(upstream.fullName);
	}

	// The trunk, and its upstream if it has one. `merged` on a branch means it
	// is contained in HEAD, which is the wrong direction — so this looks for the
	// conventional trunk names rather than pretending to compute a merge base
	// the frontend does not have.
	for (const name of ['main', 'master', 'develop', 'dev']) {
		const trunk = branches.find((branch) => branch.kind === 'branch' && branch.name === name);
		if (!trunk) continue;
		wanted.add(trunk.fullName);
		if (trunk.upstream) {
			const remote = branches.find(
				(branch) => branch.kind === 'remote' && branch.name === trunk.upstream
			);
			if (remote) wanted.add(remote.fullName);
		}
		break;
	}

	return [...wanted];
}

/** Push the current selection to the backend and restart the walk. */
async function apply(): Promise<void> {
	persist();
	if (repo.info === null) return;

	// Pinned refs that are hidden would reserve a lane nothing ever fills.
	const showing = roots();
	const held =
		showing.length === 0 ? pinned : pinned.filter((name) => showing.includes(name));

	await graph.adopt(await api.graphVisibility(showing, held));
}

export const visibility = {
	get mode(): Mode {
		return mode;
	},
	get branches(): BranchRow[] {
		return branches;
	},
	get pinned(): string[] {
		return pinned;
	},
	get hidden(): string[] {
		return hidden;
	},
	get soloed(): string[] {
		return soloed;
	},

	/** True when the graph is showing less than everything — worth saying out loud. */
	get filtered(): boolean {
		return mode !== 'all' && roots().length > 0;
	},

	isPinned(fullName: string): boolean {
		return pinned.includes(fullName);
	},
	isHidden(fullName: string): boolean {
		return mode === 'hide' && hidden.includes(fullName);
	},
	isSoloed(fullName: string): boolean {
		return mode === 'solo' && soloed.includes(fullName);
	},

	/** Re-read the branch list. Called when the graph reloads. */
	async load(): Promise<void> {
		try {
			branches = await api.branches();
		} catch {
			// A branch list we could not read leaves the modes computing against
			// nothing, which resolves to "show everything" — the safe direction.
			branches = [];
		}
	},

	async setMode(next: Mode): Promise<void> {
		mode = next;
		await apply();
	},

	/** Hide one branch, switching into hide mode if it was not already on. */
	async hide(fullName: string): Promise<void> {
		if (!hidden.includes(fullName)) hidden = [...hidden, fullName];
		mode = 'hide';
		await apply();
	},

	async unhide(fullName: string): Promise<void> {
		hidden = hidden.filter((name) => name !== fullName);
		await apply();
	},

	/** Show this branch and nothing else. */
	async solo(fullName: string): Promise<void> {
		soloed = [fullName];
		mode = 'solo';
		await apply();
	},

	/** Add to an existing solo, so two branches can be compared side by side. */
	async alsoSolo(fullName: string): Promise<void> {
		if (!soloed.includes(fullName)) soloed = [...soloed, fullName];
		mode = 'solo';
		await apply();
	},

	async showAll(): Promise<void> {
		mode = 'all';
		hidden = [];
		soloed = [];
		await apply();
	},

	/** Hold a branch's lane open on the left, or let it go. */
	async togglePin(fullName: string): Promise<void> {
		pinned = pinned.includes(fullName)
			? pinned.filter((name) => name !== fullName)
			: [...pinned, fullName];
		await apply();
	},

	/** Point the store at a repository, loading its stored state. */
	open(path: string | null): void {
		if (path === null || path === repoKey) return;
		repoKey = path;
		restore(path);
	}
};
