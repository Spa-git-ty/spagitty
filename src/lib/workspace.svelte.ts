// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * The repositories open as tabs, and where each of them was left.
 *
 * # One backend, several tabs
 *
 * Spagitty's Rust side holds **one** repository at a time: one `AppState.session`,
 * one graph worker, one filesystem watcher. That is deliberate and it is not
 * what this store changes. A tab here is a *place to go back to*, not a live
 * session — switching re-opens the repository and puts the view back where it
 * was.
 *
 * Real simultaneous sessions — a worker, a watcher and a walk per tab, with
 * events routed per repository — is a subsystem rather than a tab strip, and the
 * author decided not to buy it for one. The consequence is honest and worth
 * stating: switching costs a fresh walk, so a large history fills progressively
 * rather than appearing instantly.
 *
 * # What a tab remembers
 *
 * The route it was on and the commit that was selected. Nothing else, because
 * nothing else needs to be here: column widths already live per repository in
 * `graph/columns.svelte.ts`, panel widths in `panels.svelte.ts`, and duplicating
 * either would give two answers to one question.
 */

export interface Tab {
	/** Absolute path. The identity of a repository everywhere in the app. */
	path: string;
	/** Directory name, which is what the tab shows. */
	name: string;
}

/** Where a repository was when it was last left. */
export interface Place {
	/** The route, so a tab reopens on the screen it was on. */
	route: string;
	/** The selected commit, restored once the walk reaches it. */
	selected: string | null;
}

const STORAGE_KEY = 'spagitty.workspace';

/**
 * How many tabs are kept.
 *
 * Bounded because every tab is a row in storage and a target for a switch, and
 * a strip past this stops being a strip. The oldest inactive one falls out —
 * the repository itself is untouched and stays in All repositories.
 */
export const MAX_TABS = 12;

let tabs = $state<Tab[]>([]);
let active = $state<string | null>(null);
let places = $state<Record<string, Place>>({});

function save(): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify({ tabs, active, places }));
	} catch {
		// Storage unavailable. The tabs just will not survive a restart, which
		// is not worth failing an open over.
	}
}

/** The directory name, which is what a person calls a repository. */
export function nameOf(path: string): string {
	const parts = path.replace(/[/\\]+$/, '').split(/[/\\]/);
	return parts[parts.length - 1] || path;
}

export const workspace = {
	get tabs(): Tab[] {
		return tabs;
	},
	get active(): string | null {
		return active;
	},

	/** True when `path` is the tab currently showing. */
	isActive(path: string): boolean {
		return active === path;
	},

	/** Where this repository was last left, or null if it has no record. */
	placeOf(path: string): Place | null {
		return places[path] ?? null;
	},

	/**
	 * Record that a repository is open and showing.
	 *
	 * Called by `repo.open`, so every way into a repository — the tab strip, the
	 * All repositories screen, the command line argument, a finished clone —
	 * produces a tab. A repository that is already a tab is activated rather
	 * than duplicated.
	 */
	opened(path: string): void {
		if (!tabs.some((tab) => tab.path === path)) {
			tabs = [...tabs, { path, name: nameOf(path) }];
			if (tabs.length > MAX_TABS) {
				// The oldest tab that is not the one being looked at.
				const victim = tabs.find((tab) => tab.path !== path);
				if (victim) this.close(victim.path);
			}
		}
		active = path;
		save();
	},

	/**
	 * Remember where a repository is, before leaving it.
	 *
	 * Separate from `opened` because it is called on the way *out*: the state
	 * being saved belongs to the tab being left, not to the one being opened.
	 */
	remember(path: string, place: Place): void {
		places = { ...places, [path]: place };
		save();
	},

	/**
	 * Close a tab. The repository is untouched — it stays in Spagitty's list and
	 * in the `+` menu; only this session's tab goes.
	 *
	 * Returns the path that should be shown next: the neighbour to the right,
	 * or the one to the left when the closed tab was last, or null when nothing
	 * is left to show.
	 */
	close(path: string): string | null {
		const index = tabs.findIndex((tab) => tab.path === path);
		if (index === -1) return active;

		const remaining = tabs.filter((tab) => tab.path !== path);
		tabs = remaining;

		// The place is kept: closing a tab is not forgetting where you were, and
		// reopening the repository should still land where it left off.
		if (active !== path) {
			save();
			return active;
		}

		const next = remaining[index] ?? remaining[index - 1] ?? null;
		active = next?.path ?? null;
		save();
		return active;
	},

	/** Drop everything. The repositories themselves are untouched. */
	clear(): void {
		tabs = [];
		active = null;
		places = {};
		save();
	},

	/** Read the stored strip. Called once, from the shell. */
	init(): void {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (!stored) return;

			const parsed = JSON.parse(stored) as {
				tabs?: Tab[];
				active?: string | null;
				places?: Record<string, Place>;
			};

			// Defensive: a layout written by another version, or half-written by
			// a crash, must not stop the app opening.
			if (Array.isArray(parsed.tabs)) {
				tabs = parsed.tabs
					.filter((tab) => typeof tab?.path === 'string')
					.slice(0, MAX_TABS)
					.map((tab) => ({ path: tab.path, name: tab.name || nameOf(tab.path) }));
			}
			if (typeof parsed.active === 'string' && tabs.some((tab) => tab.path === parsed.active)) {
				active = parsed.active;
			}
			if (parsed.places && typeof parsed.places === 'object') {
				places = parsed.places;
			}
		} catch {
			// Corrupt; an empty strip is a fine starting point.
		}
	}
};
